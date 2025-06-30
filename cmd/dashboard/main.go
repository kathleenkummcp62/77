package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"syscall"

	"vpn-bruteforce-client/internal/api"
	"vpn-bruteforce-client/internal/config"
	"vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

func runSetup(cfgPath string) error {
	cmds := []struct {
		name string
		args []string
	}{
		{"go", []string{"mod", "download"}},
		{"npm", []string{"install"}},
		{"python3", []string{"-m", "pip", "install", "-r", "requirements.txt"}},
	}
	for _, c := range cmds {
		cmd := exec.Command(c.name, c.args...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("command %s %v failed: %w", c.name, c.args, err)
		}
	}

	cfg, err := config.Load(cfgPath)
	if err != nil {
		log.Printf("config load error: %v", err)
		cfg = config.Default()
	}
	dbCfg := db.ConfigFromApp(*cfg)
	database, err := db.Connect(dbCfg)
	if err != nil {
		return fmt.Errorf("db setup failed: %w", err)
	}
	defer database.Close()
	return database.InsertLog("info", "setup complete", "setup")
}

func main() {
	var (
		port       = flag.Int("port", 8080, "Dashboard server port")
		configFile = flag.String("config", "config.yaml", "Configuration file path")
		setupFlag  = flag.Bool("setup", false, "Install dependencies and exit")
	)
	flag.Parse()

	if *setupFlag {
		if err := runSetup(*configFile); err != nil {
			log.Fatalf("setup failed: %v", err)
		}
		log.Println("setup completed")
		return
	}

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

	if err := database.InsertLog("info", fmt.Sprintf("dashboard starting on port %d", *port), "dashboard"); err != nil {
		log.Printf("log insert error: %v", err)
	}

	// Initialize API server with WebSocket support
	server := api.NewServer(statsManager, *port, database)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("🛑 Shutdown signal received...")
		if derr := database.InsertLog("info", "dashboard shutdown", "dashboard"); derr != nil {
			log.Printf("log insert error: %v", derr)
		}
		database.Close()
		os.Exit(0)
	}()

	// Start the server
	log.Fatal(server.Start())
}
