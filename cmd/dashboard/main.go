package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"vpn-bruteforce-client/internal/api"
	"vpn-bruteforce-client/internal/stats"
)

func main() {
	var (
		port = flag.Int("port", 8080, "Dashboard server port")
	)
	flag.Parse()

	log.Printf("🚀 VPN Bruteforce Dashboard v3.0")
	log.Printf("🌐 Starting dashboard server on port %d", *port)

	// Initialize stats (mock for dashboard-only mode)
	statsManager := stats.New()
	go statsManager.Start()

	// Initialize API server with WebSocket support
	server := api.NewServer(statsManager, *port, nil)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("🛑 Shutdown signal received...")
		os.Exit(0)
	}()

	// Start the server
	log.Fatal(server.Start())
}
