package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"vpn-bruteforce-client/internal/api"
	"vpn-bruteforce-client/internal/config"
	"vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

func main() {
	var (
		port       = flag.Int("port", 8080, "Dashboard server port")
		configFile = flag.String("config", "config.yaml", "Configuration file path")
	)
	flag.Parse()

	log.Printf("🚀 VPN Bruteforce Dashboard v3.0")
	log.Printf("🌐 Starting dashboard server on port %d", *port)

	// Initialize stats (mock for dashboard-only mode)
	statsManager := stats.New()
	go statsManager.Start()

	// Load configuration
	cfg, err := config.Load(*configFile)
	if err != nil {
		log.Printf("config load error: %v", err)
		cfg = config.Default()
	}

	// Connect to the database using the loaded configuration
	dbCfg := db.ConfigFromApp(*cfg)
	database, err := db.Connect(dbCfg)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer database.Close()

	// Initialize API server with WebSocket support
	server := api.NewServer(statsManager, *port, database, nil)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("🛑 Shutdown signal received...")
		database.Close()
		os.Exit(0)
	}()

	// Start the server
	log.Fatal(server.Start())
}
