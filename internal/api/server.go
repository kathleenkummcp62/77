package api

import (
	"database/sql"
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

	// useVendorTasks indicates that the tasks table stores a vendor_url_id
	// reference instead of a vpn_type column. The handlers adapt their SQL
	// queries based on this flag so the API works with both schemas.
	useVendorTasks bool
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// InsertLog stores a log entry in the database when available or appends
// it to the fallback log file. Errors are logged but ignored.
func (s *Server) InsertLog(level, message, source string) {
	if s == nil {
		return
	}
	if s.db != nil {
		if err := s.db.InsertLog(level, message, source); err != nil {
			log.Printf("insert log error: %v", err)
		}
		return
	}

	path := os.Getenv("LOG_FILE")
	if path == "" {
		path = "scanner.log"
	}
	line := fmt.Sprintf("%s [%s] (%s) %s\n", time.Now().Format(time.RFC3339), strings.ToUpper(level), source, message)
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("log file error: %v", err)
		return
	}
	defer f.Close()
	if _, err := f.WriteString(line); err != nil {
		log.Printf("log write error: %v", err)
	}
}

func NewServer(stats *stats.Stats, port int, database *db.DB) *Server {
	wsServer := websocket.NewServer(stats, database)

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
			s.logEvent("error", fmt.Sprintf("database connection error: %v", err), "api")
		} else {
			s.db = dbConn
		}
	}

	if s.db != nil {
		s.detectSchema()
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
	api.HandleFunc("/tasks", s.handleTasks).Methods("GET", "POST")
	api.HandleFunc("/tasks/{id}", s.handleTask).Methods("PUT", "DELETE")
	api.HandleFunc("/tasks/bulk_delete", s.handleTasksBulkDelete).Methods("POST")

	// WebSocket endpoint
	s.router.HandleFunc("/ws", s.wsServer.HandleWebSocket)

	// Static files for dashboard
	s.router.PathPrefix("/").Handler(http.FileServer(http.Dir("./dist/")))

	// CORS middleware
	s.router.Use(s.corsMiddleware)
	// Request logging middleware
	s.router.Use(s.loggingMiddleware)
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

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(rec, r)
		msg := fmt.Sprintf("%s %s %d %v", r.Method, r.URL.Path, rec.status, time.Since(start).Truncate(time.Millisecond))
		s.InsertLog("info", msg, "api")
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
	if s.db != nil {
		rows, err := s.db.Query(`SELECT ip, status, cpu_usage, memory_usage, disk_usage, current_task FROM servers`)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		defer rows.Close()

		var servers []map[string]interface{}
		for rows.Next() {
			var ip, status, task string
			var cpu, mem, disk float64
			if err := rows.Scan(&ip, &status, &cpu, &mem, &disk, &task); err != nil {
				continue
			}
			servers = append(servers, map[string]interface{}{
				"ip":     ip,
				"status": status,
				"uptime": "-",
				"cpu":    int(cpu + 0.5),
				"memory": int(mem + 0.5),
				"disk":   int(disk + 0.5),
				"task":   task,
			})
		}
		s.sendJSON(w, APIResponse{Success: true, Data: servers})
		return
	}

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
	s.logEvent("info", fmt.Sprintf("start %s scanner", vpnType), "api")
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
	s.logEvent("info", fmt.Sprintf("stop %s scanner", vpnType), "api")
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
		rows, err := s.db.Query(`SELECT timestamp, level, message, source FROM logs ORDER BY timestamp DESC LIMIT $1`, limit)
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

	s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		cfg, err := config.Load("config.yaml")
		if err != nil {
			log.Printf("config load error: %v", err)
			s.logEvent("error", fmt.Sprintf("config load error: %v", err), "api")
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
		s.logEvent("info", "configuration updated", "api")
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

// detectSchema checks whether the tasks table uses the new vendor based
// structure. If the vendor_url_id column exists we switch the handlers to use
// that schema. The call is best effort and silently ignores errors so the
// server can still operate with the default schema.
func (s *Server) detectSchema() {
	if s.db == nil {
		return
	}
	var exists bool
	err := s.db.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='vendor_url_id')`,
	).Scan(&exists)
	if err == nil && exists {
		s.useVendorTasks = true
	}
}

func (s *Server) handleVendorURLs(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
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
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
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
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
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
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Query(`SELECT id, ip, username, password FROM credentials`)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id int
			var ip, u, p string
			rows.Scan(&id, &ip, &u, &p)
			list = append(list, map[string]interface{}{"id": id, "ip": ip, "username": u, "password": p})
		}
		s.sendJSON(w, APIResponse{Success: true, Data: list})
	case http.MethodPost:
		var item struct{ IP, Username, Password string }
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		var id int
		if err := s.db.QueryRow(`INSERT INTO credentials(ip, username, password) VALUES($1,$2,$3) RETURNING id`, item.IP, item.Username, item.Password).Scan(&id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id, "ip": item.IP, "username": item.Username, "password": item.Password}})
	}
}

func (s *Server) handleCredential(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)
	switch r.Method {
	case http.MethodPut:
		var item struct{ IP, Username, Password string }
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		if _, err := s.db.Exec(`UPDATE credentials SET ip=$1,username=$2,password=$3 WHERE id=$4`, item.IP, item.Username, item.Password, id); err != nil {
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
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
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
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
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
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
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
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
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

// handleTasks processes GET and POST requests for the /api/tasks endpoint.
// It mirrors the behaviour of handleCredentials but targets the tasks table.
func (s *Server) handleTasks(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		if s.useVendorTasks {
			rows, err := s.db.Query(`
                                SELECT t.id, t.vpn_type, t.vendor_url_id, COALESCE(v.url, ''), t.server, COALESCE(t.status, '')
                                FROM tasks t
                                LEFT JOIN vendor_urls v ON v.id = t.vendor_url_id`)
			if err != nil {
				s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
				return
			}
			defer rows.Close()
			var list []map[string]interface{}
			for rows.Next() {
				var (
					id       int
					vpnType  sql.NullString
					vendorID sql.NullInt64
					url      sql.NullString
					server   sql.NullString
					status   sql.NullString
				)
				if err := rows.Scan(&id, &vpnType, &vendorID, &url, &server, &status); err != nil {
					continue
				}
				list = append(list, map[string]interface{}{
					"id":            id,
					"vpn_type":      vpnType.String,
					"vendor_url_id": vendorID.Int64,
					"url":           url.String,
					"server":        server.String,
					"status":        status.String,
				})
			}
			s.sendJSON(w, APIResponse{Success: true, Data: list})
			return
		}

		rows, err := s.db.Query(`SELECT id, vendor, url, login, password, proxy FROM tasks`)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id int
			var vendor, url, login, password, proxy sql.NullString
			if err := rows.Scan(&id, &vendor, &url, &login, &password, &proxy); err != nil {
				continue
			}
			list = append(list, map[string]interface{}{
				"id":       id,
				"vendor":   vendor.String,
				"url":      url.String,
				"login":    login.String,
				"password": password.String,
				"proxy":    proxy.String,
			})
		}
		s.sendJSON(w, APIResponse{Success: true, Data: list})

	case http.MethodPost:
		if s.useVendorTasks {
			var item struct {
				VPNType     string `json:"vpn_type"`
				VendorURLID int    `json:"vendor_url_id"`
				Server      string `json:"server"`
				Status      string `json:"status"`
			}
			if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
				s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
				return
			}
			var id int
			err := s.db.QueryRow(`INSERT INTO tasks(vpn_type, vendor_url_id, server, status) VALUES($1,$2,$3,$4) RETURNING id`,
				item.VPNType, item.VendorURLID, item.Server, item.Status).Scan(&id)
			if err != nil {
				s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
				return
			}
			itemMap := map[string]interface{}{
				"id":            id,
				"vpn_type":      item.VPNType,
				"vendor_url_id": item.VendorURLID,
				"server":        item.Server,
				"status":        item.Status,
			}
			s.sendJSON(w, APIResponse{Success: true, Data: itemMap})
			return
		}

		var item struct {
			Vendor   string `json:"vendor"`
			URL      string `json:"url"`
			Login    string `json:"login"`
			Password string `json:"password"`
			Proxy    string `json:"proxy"`
		}
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		var id int
		if err := s.db.QueryRow(`INSERT INTO tasks(vendor, url, login, password, proxy) VALUES($1,$2,$3,$4,$5) RETURNING id`,
			item.Vendor, item.URL, item.Login, item.Password, item.Proxy).Scan(&id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id, "vendor": item.Vendor, "url": item.URL, "login": item.Login, "password": item.Password, "proxy": item.Proxy}})
	}
}

// handleTask updates or deletes a single task entry by ID.
func (s *Server) handleTask(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)
	switch r.Method {
	case http.MethodPut:
		if s.useVendorTasks {
			var item struct {
				VPNType     string `json:"vpn_type"`
				VendorURLID int    `json:"vendor_url_id"`
				Server      string `json:"server"`
				Status      string `json:"status"`
			}
			if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
				s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
				return
			}
			_, err := s.db.Exec(`UPDATE tasks SET vpn_type=$1, vendor_url_id=$2, server=$3, status=$4 WHERE id=$5`,
				item.VPNType, item.VendorURLID, item.Server, item.Status, id)
			if err != nil {
				s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
				return
			}
			s.sendJSON(w, APIResponse{Success: true})
			return
		}

		var item struct {
			Vendor   string `json:"vendor"`
			URL      string `json:"url"`
			Login    string `json:"login"`
			Password string `json:"password"`
			Proxy    string `json:"proxy"`
		}
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		_, err := s.db.Exec(`UPDATE tasks SET vendor=$1, url=$2, login=$3, password=$4, proxy=$5 WHERE id=$6`,
			item.Vendor, item.URL, item.Login, item.Password, item.Proxy, id)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true})
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM tasks WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		s.sendJSON(w, APIResponse{Success: true})
	}
}

// handleTasksBulkDelete removes multiple tasks at once using their IDs.
func (s *Server) handleTasksBulkDelete(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
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
	if _, err := s.db.Exec(`DELETE FROM tasks WHERE id = ANY($1)`, pq.Array(req.IDs)); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
		return
	}
	s.sendJSON(w, APIResponse{Success: true})
}
