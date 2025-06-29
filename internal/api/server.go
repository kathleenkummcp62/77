package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
	"gopkg.in/yaml.v3"

	"github.com/gorilla/mux"
	"vpn-bruteforce-client/internal/aggregator"
	"vpn-bruteforce-client/internal/config"
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

	if s.db == nil {
		cfg := config.Default()
		dbConn, err := db.ConnectFromApp(*cfg)
		if err != nil {
			log.Printf("database connection error: %v", err)
		} else {
			s.db = dbConn
		}
	}

	if s.db != nil {
		if err := s.initDB(); err != nil {
			log.Printf("failed to init db: %v", err)
		}
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
	api.HandleFunc("/vendor_urls", s.handleVendorURLs).Methods("GET", "POST")
	api.HandleFunc("/vendor_urls/{id}", s.handleVendorURL).Methods("PUT", "DELETE")
	api.HandleFunc("/vendor_urls/bulk_delete", s.handleVendorURLsBulkDelete).Methods("POST")
	api.HandleFunc("/credentials", s.handleCredentials).Methods("GET", "POST")
	api.HandleFunc("/credentials/{id}", s.handleCredential).Methods("PUT", "DELETE")
	api.HandleFunc("/credentials/bulk_delete", s.handleCredentialsBulkDelete).Methods("POST")
	api.HandleFunc("/proxies", s.handleProxies).Methods("GET", "POST")
	api.HandleFunc("/proxies/{id}", s.handleProxy).Methods("PUT", "DELETE")
	api.HandleFunc("/proxies/bulk_delete", s.handleProxiesBulkDelete).Methods("POST")

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
	dir := os.Getenv("STATS_DIR")
	if q := r.URL.Query().Get("dir"); q != "" {
		dir = q
	}

	aggr := aggregator.New(dir)
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

	if s.db != nil {
		rows, err := s.db.Query(`SELECT timestamp, level, message, source FROM logs ORDER BY id DESC LIMIT $1`, limit)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		defer rows.Close()

		var logs []map[string]interface{}
		for rows.Next() {
			var ts time.Time
			var level, msg, src string
			if err := rows.Scan(&ts, &level, &msg, &src); err != nil {
				continue
			}
			logs = append(logs, map[string]interface{}{
				"timestamp": ts.Format(time.RFC3339),
				"level":     level,
				"message":   msg,
				"source":    src,
			})
		}
		s.sendJSON(w, APIResponse{Success: true, Data: logs})
		return
	}

	// Fallback: read from default log file if database unavailable
	path := os.Getenv("LOG_FILE")
	if path == "" {
		path = "scanner.log"
	}
	data, err := os.ReadFile(path)
	if err == nil {
		lines := strings.Split(strings.TrimSpace(string(data)), "\n")
		if limit < len(lines) {
			lines = lines[len(lines)-limit:]
		}
		logs := make([]map[string]interface{}, len(lines))
		for i, l := range lines {
			logs[i] = map[string]interface{}{
				"timestamp": "",
				"level":     "INFO",
				"message":   l,
				"source":    "file",
			}
		}
		s.sendJSON(w, APIResponse{Success: true, Data: logs})
		return
	}

	s.sendJSON(w, APIResponse{Success: true, Data: []interface{}{}})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		cfg, err := config.Load("config.yaml")
		if err != nil {
			log.Printf("config load error: %v", err)
			cfg = config.Default()
		}
		s.sendJSON(w, APIResponse{Success: true, Data: cfg})
		return
	}

	if r.Method == http.MethodPost {
		var cfg config.Config
		if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "Invalid JSON"})
			return
		}
		data, err := yaml.Marshal(cfg)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		if err := os.WriteFile("config.yaml", data, 0644); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}

		s.wsServer.BroadcastMessage("config_update", cfg)
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

// --- Data storage handlers ---

func (s *Server) initDB() error {
	if s.db == nil {
		return nil
	}
	queries := []string{
		`CREATE TABLE IF NOT EXISTS vendor_urls (
                        id SERIAL PRIMARY KEY,
                        url TEXT NOT NULL
                )`,
		`CREATE TABLE IF NOT EXISTS credentials (
                        id SERIAL PRIMARY KEY,
                        login TEXT NOT NULL,
                        password TEXT NOT NULL
                )`,
		`CREATE TABLE IF NOT EXISTS proxies (
                        id SERIAL PRIMARY KEY,
                        address TEXT NOT NULL,
                        username TEXT,
                        password TEXT
                )`,
		`CREATE TABLE IF NOT EXISTS logs (
                        id SERIAL PRIMARY KEY,
                        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        level TEXT,
                        message TEXT,
                        source TEXT
                )`,
	}
	for _, q := range queries {
		if _, err := s.db.Exec(q); err != nil {
			return err
		}
	}
	return nil
}

func (s *Server) handleVendorURLs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Query(`SELECT id, url FROM vendor_urls`)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id int
			var url string
			rows.Scan(&id, &url)
			list = append(list, map[string]interface{}{"id": id, "url": url})
		}
		s.sendJSON(w, APIResponse{Success: true, Data: list})
	case http.MethodPost:
		var item struct {
			URL string `json:"url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		var id int
		if err := s.db.QueryRow(`INSERT INTO vendor_urls(url) VALUES($1) RETURNING id`, item.URL).Scan(&id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id, "url": item.URL}})
	}
}

func (s *Server) handleVendorURL(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)
	switch r.Method {
	case http.MethodPut:
		var item struct {
			URL string `json:"url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		if _, err := s.db.Exec(`UPDATE vendor_urls SET url=$1 WHERE id=$2`, item.URL, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true})
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM vendor_urls WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true})
	}
}

func (s *Server) handleVendorURLsBulkDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
		return
	}
	if len(req.IDs) == 0 {
		s.sendJSON(w, APIResponse{Success: true})
		return
	}
	q := `DELETE FROM vendor_urls WHERE id = ANY($1)`
	if _, err := s.db.Exec(q, pq.Array(req.IDs)); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
		return
	}
	s.sendJSON(w, APIResponse{Success: true})
}

func (s *Server) handleCredentials(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Query(`SELECT id, login, password FROM credentials`)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id int
			var l, p string
			rows.Scan(&id, &l, &p)
			list = append(list, map[string]interface{}{"id": id, "login": l, "password": p})
		}
		s.sendJSON(w, APIResponse{Success: true, Data: list})
	case http.MethodPost:
		var item struct{ Login, Password string }
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		var id int
		if err := s.db.QueryRow(`INSERT INTO credentials(login, password) VALUES($1,$2) RETURNING id`, item.Login, item.Password).Scan(&id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id, "login": item.Login, "password": item.Password}})
	}
}

func (s *Server) handleCredential(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)
	switch r.Method {
	case http.MethodPut:
		var item struct{ Login, Password string }
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		if _, err := s.db.Exec(`UPDATE credentials SET login=$1,password=$2 WHERE id=$3`, item.Login, item.Password, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true})
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM credentials WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true})
	}
}

func (s *Server) handleCredentialsBulkDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
		return
	}
	if len(req.IDs) == 0 {
		s.sendJSON(w, APIResponse{Success: true})
		return
	}
	if _, err := s.db.Exec(`DELETE FROM credentials WHERE id = ANY($1)`, pq.Array(req.IDs)); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
		return
	}
	s.sendJSON(w, APIResponse{Success: true})
}

func (s *Server) handleProxies(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Query(`SELECT id, address, username, password FROM proxies`)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id int
			var addr, u, p string
			rows.Scan(&id, &addr, &u, &p)
			list = append(list, map[string]interface{}{"id": id, "address": addr, "username": u, "password": p})
		}
		s.sendJSON(w, APIResponse{Success: true, Data: list})
	case http.MethodPost:
		var item struct{ Address, Username, Password string }
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		var id int
		if err := s.db.QueryRow(`INSERT INTO proxies(address, username, password) VALUES($1,$2,$3) RETURNING id`, item.Address, item.Username, item.Password).Scan(&id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id, "address": item.Address, "username": item.Username, "password": item.Password}})
	}
}

func (s *Server) handleProxy(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)
	switch r.Method {
	case http.MethodPut:
		var item struct{ Address, Username, Password string }
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		if _, err := s.db.Exec(`UPDATE proxies SET address=$1,username=$2,password=$3 WHERE id=$4`, item.Address, item.Username, item.Password, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true})
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM proxies WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true})
	}
}

func (s *Server) handleProxiesBulkDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
		return
	}
	if len(req.IDs) == 0 {
		s.sendJSON(w, APIResponse{Success: true})
		return
	}
	if _, err := s.db.Exec(`DELETE FROM proxies WHERE id = ANY($1)`, pq.Array(req.IDs)); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
		return
	}
	s.sendJSON(w, APIResponse{Success: true})
}
