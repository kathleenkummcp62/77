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

// Cache configuration
var (
	cacheEnabled = true
	cacheTTL     = 60 // seconds
)

// In-memory cache for API responses
type cacheItem struct {
	data      []byte
	expiresAt time.Time
}

var responseCache = make(map[string]cacheItem)

type Server struct {
	stats    *stats.Stats
	db       *db.DB
	wsServer *websocket.Server
	router   *mux.Router
	port     int

	// allowedOrigins содержит список разрешенных источников для CORS. Когда
	// пуст, разрешены любые источники, что соответствует предыдущему поведению.
	allowedOrigins map[string]bool

	// authToken сравнивается с Bearer токеном в заголовке Authorization.
	// Если пуст, проверки аутентификации пропускаются.
	authToken string

	// useVendorTasks указывает, что таблица tasks хранит vendor_url_id
	// ссылку вместо столбца vpn_type. Обработчики адаптируют свои SQL
	// запросы на основе этого флага, чтобы API работал с обеими схемами.
	useVendorTasks bool
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    *MetaData   `json:"meta,omitempty"`
}

type MetaData struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

// InsertLog сохраняет запись лога в базе данных, если она доступна, или добавляет
// ее в резервный лог-файл. Ошибки логируются, но игнорируются.
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
	defer func() {
		if err := f.Close(); err != nil {
			log.Printf("log file close error: %v", err)
		}
	}()
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

	// Загружаем разрешенные источники и токен аутентификации из окружения. Они
	// опциональны, поэтому нулевое значение сохраняет предыдущее открытое поведение
	// при отсутствии настроек.
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		s.allowedOrigins = make(map[string]bool)
		for _, o := range strings.Split(origins, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				s.allowedOrigins[o] = true
			}
		}
	}
	s.authToken = os.Getenv("API_AUTH_TOKEN")

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
	api.Use(s.authMiddleware)
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
	api.HandleFunc("/workers", s.handleWorkers).Methods("GET", "POST")
	api.HandleFunc("/workers/{id}", s.handleWorker).Methods("DELETE")
	api.HandleFunc("/proxies", s.handleProxies).Methods("GET", "POST")
	api.HandleFunc("/proxies/{id}", s.handleProxy).Methods("PUT", "DELETE")
	api.HandleFunc("/proxies/bulk_delete", s.handleProxiesBulkDelete).Methods("POST")
	api.HandleFunc("/tasks", s.handleTasks).Methods("GET", "POST")
	api.HandleFunc("/tasks/{id}", s.handleTask).Methods("PUT", "DELETE")
	api.HandleFunc("/tasks/bulk_delete", s.handleTasksBulkDelete).Methods("POST")
	api.HandleFunc("/scheduled_tasks", s.handleScheduledTasks).Methods("GET", "POST")
	api.HandleFunc("/scheduled_tasks/{id}", s.handleScheduledTask).Methods("PUT", "DELETE")
	api.HandleFunc("/health", s.handleHealth).Methods("GET")
	api.HandleFunc("/login", s.handleLogin).Methods("POST")
	api.HandleFunc("/cache", s.handleCache).Methods("GET", "DELETE")

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
		origin := r.Header.Get("Origin")
		if len(s.allowedOrigins) > 0 {
			if origin != "" {
				if s.allowedOrigins[origin] {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				} else {
					// Explicit origin provided but not allowed.
					http.Error(w, "forbidden", http.StatusForbidden)
					return
				}
			}
		} else {
			// fallback to permissive behaviour when no origins configured
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Token")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	token := os.Getenv("API_TOKEN")
	if token == "" {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip authentication for health check and login endpoints
		if r.URL.Path == "/api/health" || r.URL.Path == "/api/login" {
			next.ServeHTTP(w, r)
			return;
		}
		
		t := r.Header.Get("X-API-Token")
		if t == "" {
			auth := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			t = strings.TrimSpace(auth)
		}
		if t != token {
			w.WriteHeader(http.StatusUnauthorized)
			if err := json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "unauthorized"}); err != nil {
				log.Printf("write unauthorized response error: %v", err)
			}
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

// checkAuth enforces token based authentication when an auth token is
// configured. It expects a Bearer token in the Authorization header. When no
// auth token is set the request is allowed.
func (s *Server) checkAuth(w http.ResponseWriter, r *http.Request) bool {
	if s.authToken == "" {
		return true
	}
	const prefix = "Bearer "
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, prefix) {
		w.WriteHeader(http.StatusUnauthorized)
		return false
	}
	token := strings.TrimPrefix(header, prefix)
	if token != s.authToken {
		w.WriteHeader(http.StatusUnauthorized)
		return false
	}
	return true
}

func (s *Server) Start() error {
	s.wsServer.Start()

	log.Printf("🌐 API Server starting on port %d", s.port)
	log.Printf("📊 Dashboard: http://localhost:%d", s.port)
	log.Printf("🔌 WebSocket: ws://localhost:%d/ws", s.port)
	log.Printf("🔗 API: http://localhost:%d/api/", s.port)

	return http.ListenAndServe(fmt.Sprintf(":%d", s.port), s.router)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "vpn-bruteforce-dashboard",
	}})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var credentials struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "Invalid JSON"})
		return
	}
	
	// Mock user authentication
	users := map[string]struct {
		Password string
		Role     string
	}{
		"admin":  {"admin", "admin"},
		"user":   {"user123", "user"},
		"viewer": {"viewer123", "viewer"},
	}
	
	user, exists := users[credentials.Username]
	if !exists || user.Password != credentials.Password {
		w.WriteHeader(http.StatusUnauthorized)
		s.sendJSON(w, APIResponse{Success: false, Error: "Invalid username or password"})
		return
	}
	
	// In a real implementation, generate a JWT token here
	token := "mock-jwt-token-" + credentials.Username
	
	s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{
		"token": token,
		"user": map[string]string{
			"username": credentials.Username,
			"role":     user.Role,
		},
	}})
}

func (s *Server) handleCache(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		// Get cache statistics
		stats := map[string]interface{}{
			"enabled":     cacheEnabled,
			"ttl":         cacheTTL,
			"items":       len(responseCache),
			"memory_used": calculateCacheSize(),
		}
		s.sendJSON(w, APIResponse{Success: true, Data: stats})
	} else if r.Method == http.MethodDelete {
		// Clear cache
		responseCache = make(map[string]cacheItem)
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]string{
			"message": "Cache cleared successfully",
		}})
	}
}

func (s *Server) sendJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("write JSON error: %v", err)
	}
}

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	// Check cache
	cacheKey := "stats"
	if cacheEnabled {
		if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cachedResponse.data)
			return
		}
	}

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

	response := APIResponse{Success: true, Data: stats}
	
	// Cache response
	if cacheEnabled {
		responseBytes, err := json.Marshal(response)
		if err == nil {
			responseCache[cacheKey] = cacheItem{
				data:      responseBytes,
				expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
			}
		}
	}

	s.sendJSON(w, response)
}

func (s *Server) handleServers(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters
	page, pageSize := getPaginationParams(r)

	// Check cache
	cacheKey := fmt.Sprintf("servers_page%d_size%d", page, pageSize)
	if cacheEnabled {
		if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cachedResponse.data)
			return
		}
	}

	if s.db != nil {
		// Use optimized query with pagination
		servers, total, err := s.db.GetServersByFilters(map[string]interface{}{}, page, pageSize)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}

		// Calculate total pages
		totalPages := (total + pageSize - 1) / pageSize

		response := APIResponse{
			Success: true, 
			Data: servers,
			Meta: &MetaData{
				Page:       page,
				PageSize:   pageSize,
				TotalItems: total,
				TotalPages: totalPages,
			},
		}
		
		// Cache response
		if cacheEnabled {
			responseBytes, err := json.Marshal(response)
			if err == nil {
				responseCache[cacheKey] = cacheItem{
					data:      responseBytes,
					expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
				}
			}
		}

		s.sendJSON(w, response)
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

	response := APIResponse{
		Success: true, 
		Data: servers,
		Meta: &MetaData{
			Page:       page,
			PageSize:   pageSize,
			TotalItems: len(servers),
			TotalPages: 1,
		},
	}
	
	// Cache response
	if cacheEnabled {
		responseBytes, err := json.Marshal(response)
		if err == nil {
			responseCache[cacheKey] = cacheItem{
				data:      responseBytes,
				expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
			}
		}
	}

	s.sendJSON(w, response)
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
	// Parse pagination parameters
	page, pageSize := getPaginationParams(r)
	
	// Parse filter parameters
	level := r.URL.Query().Get("level")
	source := r.URL.Query().Get("source")
	search := r.URL.Query().Get("search")
	
	// Check cache
	cacheKey := fmt.Sprintf("logs_page%d_size%d_level%s_source%s_search%s", 
		page, pageSize, level, source, search)
	if cacheEnabled {
		if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cachedResponse.data)
			return
		}
	}

	if s.db != nil {
		var logs []map[string]interface{}
		var total int
		var err error
		
		// Apply filters
		if search != "" {
			// Search in logs
			logs, total, err = s.db.GetLogsWithSearch(search, page, pageSize)
		} else if level != "" || source != "" {
			// Filter by level and/or source
			filters := make(map[string]interface{})
			if level != "" {
				filters["level"] = level
			}
			if source != "" {
				filters["source"] = source
			}
			logs, total, err = s.db.GetLogsWithFilters(filters, page, pageSize)
		} else {
			// Get all logs with pagination
			logs, total, err = s.db.GetLogsWithPagination(page, pageSize)
		}
		
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Calculate total pages
		totalPages := (total + pageSize - 1) / pageSize
		
		response := APIResponse{
			Success: true, 
			Data: logs,
			Meta: &MetaData{
				Page:       page,
				PageSize:   pageSize,
				TotalItems: total,
				TotalPages: totalPages,
			},
		}
		
		// Cache response
		if cacheEnabled {
			responseBytes, err := json.Marshal(response)
			if err == nil {
				responseCache[cacheKey] = cacheItem{
					data:      responseBytes,
					expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
				}
			}
		}
		
		s.sendJSON(w, response)
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
		s.db.UseVendorTasks = true
		s.useVendorTasks = true
	}
}

func (s *Server) handleVendorURLs(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	
	// Parse pagination parameters
	page, pageSize := getPaginationParams(r)
	
	// Parse search parameter
	search := r.URL.Query().Get("search")
	
	switch r.Method {
	case http.MethodGet:
		// Check cache
		cacheKey := fmt.Sprintf("vendor_urls_page%d_size%d_search%s", page, pageSize, search)
		if cacheEnabled {
			if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "HIT")
				w.Write(cachedResponse.data)
				return
			}
		}
		
		var vendorURLs []map[string]interface{}
		var total int
		var err error
		
		if search != "" {
			// Search vendor URLs
			vendorURLs, total, err = s.db.GetVendorURLsWithSearch(search, page, pageSize)
		} else {
			// Get all vendor URLs with pagination
			vendorURLs, total, err = s.db.GetVendorURLsWithPagination(page, pageSize)
		}
		
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Calculate total pages
		totalPages := (total + pageSize - 1) / pageSize
		
		response := APIResponse{
			Success: true, 
			Data: vendorURLs,
			Meta: &MetaData{
				Page:       page,
				PageSize:   pageSize,
				TotalItems: total,
				TotalPages: totalPages,
			},
		}
		
		// Cache response
		if cacheEnabled {
			responseBytes, err := json.Marshal(response)
			if err == nil {
				responseCache[cacheKey] = cacheItem{
					data:      responseBytes,
					expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
				}
			}
		}
		
		s.sendJSON(w, response)
		
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
		
		// Clear cache for vendor_urls
		clearCacheByPrefix("vendor_urls")
		
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
		
		// Clear cache for vendor_urls
		clearCacheByPrefix("vendor_urls")
		
		s.sendJSON(w, APIResponse{Success: true})
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM vendor_urls WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for vendor_urls
		clearCacheByPrefix("vendor_urls")
		
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
	
	// Clear cache for vendor_urls
	clearCacheByPrefix("vendor_urls")
	
	s.sendJSON(w, APIResponse{Success: true})
}

func (s *Server) handleCredentials(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(w, r) {
		return
	}
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	
	// Parse pagination parameters
	page, pageSize := getPaginationParams(r)
	
	// Parse search parameter
	search := r.URL.Query().Get("search")
	
	switch r.Method {
	case http.MethodGet:
		// Check cache
		cacheKey := fmt.Sprintf("credentials_page%d_size%d_search%s", page, pageSize, search)
		if cacheEnabled {
			if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "HIT")
				w.Write(cachedResponse.data)
				return
			}
		}
		
		var credentials []map[string]interface{}
		var total int
		var err error
		
		if search != "" {
			// Search credentials
			credentials, total, err = s.db.GetCredentialsWithSearch(search, page, pageSize)
		} else {
			// Get all credentials with pagination
			credentials, total, err = s.db.GetCredentialsWithPagination(page, pageSize)
		}
		
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Calculate total pages
		totalPages := (total + pageSize - 1) / pageSize
		
		response := APIResponse{
			Success: true, 
			Data: credentials,
			Meta: &MetaData{
				Page:       page,
				PageSize:   pageSize,
				TotalItems: total,
				TotalPages: totalPages,
			},
		}
		
		// Cache response
		if cacheEnabled {
			responseBytes, err := json.Marshal(response)
			if err == nil {
				responseCache[cacheKey] = cacheItem{
					data:      responseBytes,
					expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
				}
			}
		}
		
		s.sendJSON(w, response)
		
	case http.MethodPost:
		var item struct{ IP, Username, Password string }
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		encIP, _ := encryptString(item.IP)
		encU, _ := encryptString(item.Username)
		encP, _ := encryptString(item.Password)
		var id int
		if err := s.db.QueryRow(`INSERT INTO credentials(ip, username, password) VALUES($1,$2,$3) RETURNING id`, encIP, encU, encP).Scan(&id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for credentials
		clearCacheByPrefix("credentials")
		
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id, "ip": item.IP, "username": item.Username, "password": item.Password}})
	}
}

func (s *Server) handleCredential(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(w, r) {
		return
	}
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
		encIP, _ := encryptString(item.IP)
		encU, _ := encryptString(item.Username)
		encP, _ := encryptString(item.Password)
		if _, err := s.db.Exec(`UPDATE credentials SET ip=$1,username=$2,password=$3 WHERE id=$4`, encIP, encU, encP, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for credentials
		clearCacheByPrefix("credentials")
		
		s.sendJSON(w, APIResponse{Success: true})
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM credentials WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for credentials
		clearCacheByPrefix("credentials")
		
		s.sendJSON(w, APIResponse{Success: true})
	}
}

func (s *Server) handleCredentialsBulkDelete(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(w, r) {
		return
	}
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
	
	// Clear cache for credentials
	clearCacheByPrefix("credentials")
	
	s.sendJSON(w, APIResponse{Success: true})
}

func (s *Server) handleWorkers(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	
	// Parse pagination parameters
	page, pageSize := getPaginationParams(r)
	
	switch r.Method {
	case http.MethodGet:
		// Check cache
		cacheKey := fmt.Sprintf("workers_page%d_size%d", page, pageSize)
		if cacheEnabled {
			if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "HIT")
				w.Write(cachedResponse.data)
				return
			}
		}
		
		// Build query with pagination
		query := `SELECT id, ip, port, username, password FROM workers LIMIT $1 OFFSET $2`
		offset := (page - 1) * pageSize
		
		// Get total count
		var total int
		err := s.db.QueryRow(`SELECT COUNT(*) FROM workers`).Scan(&total)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Execute query
		rows, err := s.db.Query(query, pageSize, offset)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		defer rows.Close()
		
		var workers []map[string]interface{}
		for rows.Next() {
			var id, port int
			var ip, u, p string
			if err := rows.Scan(&id, &ip, &port, &u, &p); err != nil {
				continue
			}
			workers = append(workers, map[string]interface{}{"id": id, "ip": ip, "port": port, "username": u, "password": p})
		}
		
		// Calculate total pages
		totalPages := (total + pageSize - 1) / pageSize
		
		response := APIResponse{
			Success: true, 
			Data: workers,
			Meta: &MetaData{
				Page:       page,
				PageSize:   pageSize,
				TotalItems: total,
				TotalPages: totalPages,
			},
		}
		
		// Cache response
		if cacheEnabled {
			responseBytes, err := json.Marshal(response)
			if err == nil {
				responseCache[cacheKey] = cacheItem{
					data:      responseBytes,
					expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
				}
			}
		}
		
		s.sendJSON(w, response)
		
	case http.MethodPost:
		var item struct {
			IP       string `json:"ip"`
			Port     int    `json:"port"`
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		var id int
		if err := s.db.QueryRow(`INSERT INTO workers(ip, port, username, password) VALUES($1,$2,$3,$4) RETURNING id`, item.IP, item.Port, item.Username, item.Password).Scan(&id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for workers
		clearCacheByPrefix("workers")
		
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id, "ip": item.IP, "port": item.Port, "username": item.Username, "password": item.Password}})
	}
}

func (s *Server) handleWorker(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)
	if r.Method == http.MethodDelete {
		if _, err := s.db.Exec(`DELETE FROM workers WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for workers
		clearCacheByPrefix("workers")
		
		s.sendJSON(w, APIResponse{Success: true})
	}
}

func (s *Server) handleProxies(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	
	// Parse pagination parameters
	page, pageSize := getPaginationParams(r)
	
	// Parse search parameter
	search := r.URL.Query().Get("search")
	
	switch r.Method {
	case http.MethodGet:
		// Check cache
		cacheKey := fmt.Sprintf("proxies_page%d_size%d_search%s", page, pageSize, search)
		if cacheEnabled {
			if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "HIT")
				w.Write(cachedResponse.data)
				return
			}
		}
		
		var proxies []map[string]interface{}
		var total int
		var err error
		
		if search != "" {
			// Search proxies
			proxies, total, err = s.db.GetProxiesWithSearch(search, page, pageSize)
		} else {
			// Get all proxies with pagination
			proxies, total, err = s.db.GetProxiesWithPagination(page, pageSize)
		}
		
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Calculate total pages
		totalPages := (total + pageSize - 1) / pageSize
		
		response := APIResponse{
			Success: true, 
			Data: proxies,
			Meta: &MetaData{
				Page:       page,
				PageSize:   pageSize,
				TotalItems: total,
				TotalPages: totalPages,
			},
		}
		
		// Cache response
		if cacheEnabled {
			responseBytes, err := json.Marshal(response)
			if err == nil {
				responseCache[cacheKey] = cacheItem{
					data:      responseBytes,
					expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
				}
			}
		}
		
		s.sendJSON(w, response)
		
	case http.MethodPost:
		var item struct{ Address, Username, Password string }
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		encAddr, _ := encryptString(item.Address)
		encU, _ := encryptString(item.Username)
		encP, _ := encryptString(item.Password)
		var id int
		if err := s.db.QueryRow(`INSERT INTO proxies(address, username, password) VALUES($1,$2,$3) RETURNING id`, encAddr, encU, encP).Scan(&id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for proxies
		clearCacheByPrefix("proxies")
		
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
		encAddr, _ := encryptString(item.Address)
		encU, _ := encryptString(item.Username)
		encP, _ := encryptString(item.Password)
		if _, err := s.db.Exec(`UPDATE proxies SET address=$1,username=$2,password=$3 WHERE id=$4`, encAddr, encU, encP, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for proxies
		clearCacheByPrefix("proxies")
		
		s.sendJSON(w, APIResponse{Success: true})
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM proxies WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for proxies
		clearCacheByPrefix("proxies")
		
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
	
	// Clear cache for proxies
	clearCacheByPrefix("proxies")
	
	s.sendJSON(w, APIResponse{Success: true})
}

// handleTasks processes GET and POST requests for the /api/tasks endpoint.
// It mirrors the behaviour of handleCredentials but targets the tasks table.
func (s *Server) handleTasks(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(w, r) {
		return
	}
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	
	// Parse pagination parameters
	page, pageSize := getPaginationParams(r)
	
	// Parse filter parameters
	vpnType := r.URL.Query().Get("vpn_type")
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	switch r.Method {
	case http.MethodGet:
		// Check cache
		cacheKey := fmt.Sprintf("tasks_page%d_size%d_vpnType%s_status%s_search%s", 
			page, pageSize, vpnType, status, search)
		if cacheEnabled {
			if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "HIT")
				w.Write(cachedResponse.data)
				return
			}
		}
		
		var tasks []map[string]interface{}
		var total int
		var err error
		
		if search != "" {
			// Search tasks
			tasks, total, err = s.db.GetTasksWithSearch(search, page, pageSize)
		} else if vpnType != "" || status != "" {
			// Filter by vpn_type and/or status
			filters := make(map[string]interface{})
			if vpnType != "" {
				filters["vpn_type"] = vpnType
			}
			if status != "" {
				filters["status"] = status
			}
			tasks, total, err = s.db.GetTasksWithFilters(filters, page, pageSize)
		} else {
			// Get all tasks with pagination
			tasks, total, err = s.db.GetTasksWithPagination(page, pageSize)
		}
		
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Calculate total pages
		totalPages := (total + pageSize - 1) / pageSize
		
		response := APIResponse{
			Success: true, 
			Data: tasks,
			Meta: &MetaData{
				Page:       page,
				PageSize:   pageSize,
				TotalItems: total,
				TotalPages: totalPages,
			},
		}
		
		// Cache response
		if cacheEnabled {
			responseBytes, err := json.Marshal(response)
			if err == nil {
				responseCache[cacheKey] = cacheItem{
					data:      responseBytes,
					expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
				}
			}
		}
		
		s.sendJSON(w, response)

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
			
			// Clear cache for tasks
			clearCacheByPrefix("tasks")
			
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
		
		// Clear cache for tasks
		clearCacheByPrefix("tasks")
		
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id, "vendor": item.Vendor, "url": item.URL, "login": item.Login, "password": item.Password, "proxy": item.Proxy}})
	}
}

// handleTask updates or deletes a single task entry by ID.
func (s *Server) handleTask(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(w, r) {
		return
	}
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
			
			// Clear cache for tasks
			clearCacheByPrefix("tasks")
			
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
		
		// Clear cache for tasks
		clearCacheByPrefix("tasks")
		
		s.sendJSON(w, APIResponse{Success: true})
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM tasks WHERE id=$1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for tasks
		clearCacheByPrefix("tasks")
		
		s.sendJSON(w, APIResponse{Success: true})
	}
}

// handleTasksBulkDelete removes multiple tasks at once using their IDs.
func (s *Server) handleTasksBulkDelete(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(w, r) {
		return
	}
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
	
	// Clear cache for tasks
	clearCacheByPrefix("tasks")
	
	s.sendJSON(w, APIResponse{Success: true})
}

// handleScheduledTasks handles GET and POST requests for scheduled tasks
func (s *Server) handleScheduledTasks(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(w, r) {
		return
	}
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	
	// Parse pagination parameters
	page, pageSize := getPaginationParams(r)
	
	switch r.Method {
	case http.MethodGet:
		// Check cache
		cacheKey := fmt.Sprintf("scheduled_tasks_page%d_size%d", page, pageSize)
		if cacheEnabled {
			if cachedResponse, ok := responseCache[cacheKey]; ok && time.Now().Before(cachedResponse.expiresAt) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "HIT")
				w.Write(cachedResponse.data)
				return
			}
		}
		
		// Get scheduled tasks with pagination
		tasks, total, err := s.db.GetScheduledTasksWithPagination(page, pageSize)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Calculate total pages
		totalPages := (total + pageSize - 1) / pageSize
		
		response := APIResponse{
			Success: true, 
			Data: tasks,
			Meta: &MetaData{
				Page:       page,
				PageSize:   pageSize,
				TotalItems: total,
				TotalPages: totalPages,
			},
		}
		
		// Cache response
		if cacheEnabled {
			responseBytes, err := json.Marshal(response)
			if err == nil {
				responseCache[cacheKey] = cacheItem{
					data:      responseBytes,
					expiresAt: time.Now().Add(time.Duration(cacheTTL) * time.Second),
				}
			}
		}
		
		s.sendJSON(w, response)
		
	case http.MethodPost:
		var item struct {
			Title            string   `json:"title"`
			Description      string   `json:"description"`
			TaskType         string   `json:"taskType"`
			VPNType          string   `json:"vpnType"`
			ScheduledAt      string   `json:"scheduledDateTime"`
			Repeat           string   `json:"repeat"`
			Servers          []string `json:"servers"`
			Active           bool     `json:"active"`
			Executed         bool     `json:"executed"`
		}
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		
		// Convert servers array to comma-separated string
		serversStr := strings.Join(item.Servers, ",")
		
		// Parse scheduled time
		scheduledAt, err := time.Parse(time.RFC3339, item.ScheduledAt)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid scheduled time format"})
			return
		}
		
		var id int
		err = s.db.QueryRow(`
			INSERT INTO scheduled_tasks(
				title, description, task_type, vpn_type, 
				scheduled_at, repeat, servers, active, executed, created_at
			) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
			RETURNING id
		`, 
			item.Title, item.Description, item.TaskType, item.VPNType,
			scheduledAt, item.Repeat, serversStr, item.Active, item.Executed, time.Now(),
		).Scan(&id)
		
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for scheduled_tasks
		clearCacheByPrefix("scheduled_tasks")
		
		s.sendJSON(w, APIResponse{Success: true, Data: map[string]interface{}{"id": id}})
	}
}

// handleScheduledTask handles PUT and DELETE requests for a single scheduled task
func (s *Server) handleScheduledTask(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(w, r) {
		return
	}
	if s.db == nil {
		s.sendJSON(w, APIResponse{Success: false, Error: "database unavailable"})
		return
	}
	
	idStr := mux.Vars(r)["id"]
	id, _ := strconv.Atoi(idStr)
	
	switch r.Method {
	case http.MethodPut:
		var item struct {
			Title            string   `json:"title"`
			Description      string   `json:"description"`
			TaskType         string   `json:"taskType"`
			VPNType          string   `json:"vpnType"`
			ScheduledAt      string   `json:"scheduledDateTime"`
			Repeat           string   `json:"repeat"`
			Servers          []string `json:"servers"`
			Active           bool     `json:"active"`
			Executed         bool     `json:"executed"`
		}
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid json"})
			return
		}
		
		// Convert servers array to comma-separated string
		serversStr := strings.Join(item.Servers, ",")
		
		// Parse scheduled time
		scheduledAt, err := time.Parse(time.RFC3339, item.ScheduledAt)
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: "invalid scheduled time format"})
			return
		}
		
		_, err = s.db.Exec(`
			UPDATE scheduled_tasks SET
				title = $1, description = $2, task_type = $3, vpn_type = $4,
				scheduled_at = $5, repeat = $6, servers = $7, active = $8, executed = $9
			WHERE id = $10
		`,
			item.Title, item.Description, item.TaskType, item.VPNType,
			scheduledAt, item.Repeat, serversStr, item.Active, item.Executed, id,
		)
		
		if err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for scheduled_tasks
		clearCacheByPrefix("scheduled_tasks")
		
		s.sendJSON(w, APIResponse{Success: true})
		
	case http.MethodDelete:
		if _, err := s.db.Exec(`DELETE FROM scheduled_tasks WHERE id = $1`, id); err != nil {
			s.sendJSON(w, APIResponse{Success: false, Error: err.Error()})
			return
		}
		
		// Clear cache for scheduled_tasks
		clearCacheByPrefix("scheduled_tasks")
		
		s.sendJSON(w, APIResponse{Success: true})
	}
}

// Helper functions

// getPaginationParams extracts page and pageSize from request query parameters
func getPaginationParams(r *http.Request) (page, pageSize int) {
	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("page_size")
	
	page = 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	
	pageSize = 10
	if pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}
	
	return page, pageSize
}

// clearCacheByPrefix clears all cache items with keys starting with the given prefix
func clearCacheByPrefix(prefix string) {
	if !cacheEnabled {
		return
	}
	
	for key := range responseCache {
		if strings.HasPrefix(key, prefix) {
			delete(responseCache, key)
		}
	}
}

// calculateCacheSize calculates the approximate size of the cache in bytes
func calculateCacheSize() int {
	size := 0
	for _, item := range responseCache {
		size += len(item.data)
	}
	return size
}