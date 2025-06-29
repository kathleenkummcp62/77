package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"vpn-bruteforce-client/internal/aggregator"
	"vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
	"vpn-bruteforce-client/internal/websocket"
)

type Server struct {
	stats    *stats.Stats
	db       *db.DB
	wsServer *websocket.Server
	router   *mux.Router
	port     int
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func NewServer(stats *stats.Stats, port int, database *db.DB) *Server {
	wsServer := websocket.NewServer(stats)

	s := &Server{
		stats:    stats,
		db:       database,
		wsServer: wsServer,
		router:   mux.NewRouter(),
		port:     port,
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API routes
	api := s.router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/stats", s.handleStats).Methods("GET")
	api.HandleFunc("/servers", s.handleServers).Methods("GET")
	api.HandleFunc("/start", s.handleStart).Methods("POST")
	api.HandleFunc("/stop", s.handleStop).Methods("POST")
	api.HandleFunc("/logs", s.handleLogs).Methods("GET")
	api.HandleFunc("/config", s.handleConfig).Methods("GET", "POST")

	// WebSocket endpoint
	s.router.HandleFunc("/ws", s.wsServer.HandleWebSocket)

	// Static files for dashboard
	s.router.PathPrefix("/").Handler(http.FileServer(http.Dir("./dist/")))

	// CORS middleware
	s.router.Use(s.corsMiddleware)
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) Start() error {
	s.wsServer.Start()

	log.Printf("🌐 API Server starting on port %d", s.port)
	log.Printf("📊 Dashboard: http://localhost:%d", s.port)
	log.Printf("🔌 WebSocket: ws://localhost:%d/ws", s.port)
	log.Printf("🔗 API: http://localhost:%d/api/", s.port)

	return http.ListenAndServe(fmt.Sprintf(":%d", s.port), s.router)
}

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	stats := map[string]interface{}{
		"goods":        s.stats.GetGoods(),
		"bads":         s.stats.GetBads(),
		"errors":       s.stats.GetErrors(),
		"offline":      s.stats.GetOffline(),
		"ipblock":      s.stats.GetIPBlock(),
		"processed":    s.stats.GetProcessed(),
		"rps":          s.stats.GetRPS(),
		"avg_rps":      s.stats.GetAvgRPS(),
		"peak_rps":     s.stats.GetPeakRPS(),
		"threads":      s.stats.GetThreads(),
		"uptime":       s.stats.GetUptime(),
		"success_rate": s.stats.GetSuccessRate(),
	}

	s.sendJSON(w, APIResponse{Success: true, Data: stats})
}

func (s *Server) handleServers(w http.ResponseWriter, r *http.Request) {
	aggr := aggregator.New(".")
	infos, err := aggr.GetServerInfo()
	if err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
		return
	}

	servers := make([]map[string]interface{}, len(infos))
	for i, inf := range infos {
		servers[i] = map[string]interface{}{
			"ip":        inf.IP,
			"status":    inf.Status,
			"uptime":    inf.Uptime,
			"cpu":       inf.CPU,
			"memory":    inf.Memory,
			"disk":      inf.Disk,
			"speed":     inf.Speed,
			"processed": inf.Processed,
			"goods":     inf.Goods,
			"bads":      inf.Bads,
			"errors":    inf.Errors,
			"progress":  inf.Progress,
			"task":      inf.Task,
		}
	}

	s.sendJSON(w, APIResponse{Success: true, Data: servers})
}

func (s *Server) handleStart(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "Invalid JSON"})
		return
	}

	vpnType, ok := req["vpn_type"].(string)
	if !ok {
		s.sendJSON(w, APIResponse{Success: false, Error: "vpn_type required"})
		return
	}

	// Broadcast start command via WebSocket
	s.wsServer.BroadcastMessage("scanner_command", map[string]interface{}{
		"action":   "start",
		"vpn_type": vpnType,
		"status":   "starting",
	})

	log.Printf("🚀 Starting %s scanner via API", vpnType)
	s.sendJSON(w, APIResponse{Success: true, Data: map[string]string{
		"status":   "started",
		"vpn_type": vpnType,
	}})
}

func (s *Server) handleStop(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "Invalid JSON"})
		return
	}

	vpnType, ok := req["vpn_type"].(string)
	if !ok {
		s.sendJSON(w, APIResponse{Success: false, Error: "vpn_type required"})
		return
	}

	// Broadcast stop command via WebSocket
	s.wsServer.BroadcastMessage("scanner_command", map[string]interface{}{
		"action":   "stop",
		"vpn_type": vpnType,
		"status":   "stopping",
	})

	log.Printf("🛑 Stopping %s scanner via API", vpnType)
	s.sendJSON(w, APIResponse{Success: true, Data: map[string]string{
		"status":   "stopped",
		"vpn_type": vpnType,
	}})
}

func (s *Server) handleLogs(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	// Mock logs - in real implementation, read from log files
	logs := []map[string]interface{}{
		{
			"timestamp": "2024-01-15T10:30:00Z",
			"level":     "INFO",
			"message":   "Ultra-fast engine started successfully",
			"source":    "engine",
		},
		{
			"timestamp": "2024-01-15T10:30:15Z",
			"level":     "SUCCESS",
			"message":   "Valid credential found: example.com;guest;guest",
			"source":    "fortinet",
		},
		{
			"timestamp": "2024-01-15T10:30:30Z",
			"level":     "ERROR",
			"message":   "Connection timeout for 192.168.1.100",
			"source":    "network",
		},
		{
			"timestamp": "2024-01-15T10:30:45Z",
			"level":     "INFO",
			"message":   fmt.Sprintf("Current RPS: %d", s.stats.GetRPS()),
			"source":    "stats",
		},
	}

	if limit < len(logs) {
		logs = logs[:limit]
	}

	s.sendJSON(w, APIResponse{Success: true, Data: logs})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		config := map[string]interface{}{
			"threads":     3000,
			"rate_limit":  8000,
			"timeout":     "3s",
			"vpn_type":    "fortinet",
			"auto_scale":  true,
			"min_threads": 1000,
			"max_threads": 5000,
		}
		s.sendJSON(w, APIResponse{Success: true, Data: config})
	} else if r.Method == "POST" {
		var config map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "Invalid JSON"})
			return
		}

		// Broadcast config update via WebSocket
		s.wsServer.BroadcastMessage("config_update", config)

		log.Printf("⚙️ Configuration updated via API")
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]string{
			"status": "updated",
		}})
	}
}

func (s *Server) sendJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
