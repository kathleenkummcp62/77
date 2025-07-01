package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
	"vpn-bruteforce-client/internal/websocket"
)

// Server represents the API server.
type Server struct {
	stats      *stats.Stats
	port       int
	db         *db.DB
	router     *mux.Router
	wsServer   *websocket.Server
}

// APIResponse is the standard response format for all API endpoints.
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// NewServer creates a new API server.
func NewServer(statsManager *stats.Stats, port int, database *db.DB) *Server {
	s := &Server{
		stats:    statsManager,
		port:     port,
		db:       database,
		router:   mux.NewRouter(),
	}

	// Initialize WebSocket server
	s.wsServer = websocket.NewServer(statsManager, database)
	s.wsServer.Start()

	// Set up routes
	s.setupRoutes()

	return s
}

// Start starts the API server.
func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.port)
	log.Printf("Starting API server on %s", addr)
	return http.ListenAndServe(addr, s.router)
}

// InsertLog inserts a log entry into the database.
func (s *Server) InsertLog(level, message, source string) {
	if s.db != nil {
		if err := s.db.InsertLog(level, message, source); err != nil {
			log.Printf("log insert error: %v", err)
		}
	}
}

// setupRoutes configures all API routes.
func (s *Server) setupRoutes() {
	// API routes
	api := s.router.PathPrefix("/api").Subrouter()

	// Health check
	api.HandleFunc("/health", s.handleHealth).Methods("GET")

	// Stats
	api.HandleFunc("/stats", s.handleGetStats).Methods("GET")

	// Servers
	api.HandleFunc("/servers", s.handleGetServers).Methods("GET")

	// Credentials
	api.HandleFunc("/credentials", s.handleGetCredentials).Methods("GET")
	api.HandleFunc("/credentials", s.handleCreateCredential).Methods("POST")
	api.HandleFunc("/credentials/{id:[0-9]+}", s.handleUpdateCredential).Methods("PUT")
	api.HandleFunc("/credentials/{id:[0-9]+}", s.handleDeleteCredential).Methods("DELETE")
	api.HandleFunc("/credentials/bulk_delete", s.handleBulkDeleteCredentials).Methods("POST")

	// Proxies
	api.HandleFunc("/proxies", s.handleGetProxies).Methods("GET")
	api.HandleFunc("/proxies", s.handleCreateProxy).Methods("POST")
	api.HandleFunc("/proxies/{id:[0-9]+}", s.handleUpdateProxy).Methods("PUT")
	api.HandleFunc("/proxies/{id:[0-9]+}", s.handleDeleteProxy).Methods("DELETE")

	// Tasks
	api.HandleFunc("/tasks", s.handleGetTasks).Methods("GET")
	api.HandleFunc("/tasks", s.handleCreateTask).Methods("POST")
	api.HandleFunc("/tasks/{id:[0-9]+}", s.handleUpdateTask).Methods("PUT")
	api.HandleFunc("/tasks/{id:[0-9]+}", s.handleDeleteTask).Methods("DELETE")
	api.HandleFunc("/tasks/bulk_delete", s.handleBulkDeleteTasks).Methods("POST")

	// Vendor URLs
	api.HandleFunc("/vendor_urls", s.handleGetVendorURLs).Methods("GET")
	api.HandleFunc("/vendor_urls", s.handleCreateVendorURL).Methods("POST")
	api.HandleFunc("/vendor_urls/{id:[0-9]+}", s.handleUpdateVendorURL).Methods("PUT")
	api.HandleFunc("/vendor_urls/{id:[0-9]+}", s.handleDeleteVendorURL).Methods("DELETE")

	// Logs
	api.HandleFunc("/logs", s.handleGetLogs).Methods("GET")

	// Scanner control
	api.HandleFunc("/start", s.handleStartScanner).Methods("POST")
	api.HandleFunc("/stop", s.handleStopScanner).Methods("POST")
	api.HandleFunc("/config", s.handleUpdateConfig).Methods("POST")

	// Scheduled tasks
	api.HandleFunc("/scheduled_tasks", s.handleGetScheduledTasks).Methods("GET")
	api.HandleFunc("/scheduled_tasks", s.handleCreateScheduledTask).Methods("POST")
	api.HandleFunc("/scheduled_tasks/{id:[0-9]+}", s.handleUpdateScheduledTask).Methods("PUT")
	api.HandleFunc("/scheduled_tasks/{id:[0-9]+}", s.handleDeleteScheduledTask).Methods("DELETE")

	// WebSocket endpoint
	s.router.HandleFunc("/ws", s.wsServer.HandleWebSocket)

	// Serve static files for the dashboard
	s.router.PathPrefix("/").Handler(http.FileServer(http.Dir("./dist")))
}

// handleHealth handles the health check endpoint.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339),
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleGetStats handles the stats endpoint.
func (s *Server) handleGetStats(w http.ResponseWriter, r *http.Request) {
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

	resp := APIResponse{
		Success: true,
		Data:    stats,
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleGetServers handles the servers endpoint.
func (s *Server) handleGetServers(w http.ResponseWriter, r *http.Request) {
	// Get server info from WebSocket server
	servers := s.wsServer.GetServerInfo()

	resp := APIResponse{
		Success: true,
		Data:    servers,
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleGetCredentials handles the credentials endpoint.
func (s *Server) handleGetCredentials(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 10

	// Parse pagination parameters
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	// Get credentials from database
	credentials, total, err := s.db.GetCredentialsWithPagination(page, pageSize)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Build pagination response
	pagination := BuildPaginationResponse(page, pageSize, total)

	resp := APIResponse{
		Success: true,
		Data:    credentials,
	}
	s.writeJSONWithMeta(w, http.StatusOK, resp, pagination)
}

// handleCreateCredential handles the create credential endpoint.
func (s *Server) handleCreateCredential(w http.ResponseWriter, r *http.Request) {
	var cred struct {
		IP       string `json:"ip"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&cred); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Encrypt sensitive data
	encryptedIP, err := encryptString(cred.IP)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	encryptedUsername, err := encryptString(cred.Username)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	encryptedPassword, err := encryptString(cred.Password)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	// Insert into database
	var id int
	err = s.db.QueryRow(
		`INSERT INTO credentials(ip, username, password) VALUES($1, $2, $3) RETURNING id`,
		encryptedIP, encryptedUsername, encryptedPassword,
	).Scan(&id)

	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("credential created: %s", cred.IP), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":       id,
			"ip":       cred.IP,
			"username": cred.Username,
			"password": cred.Password,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleUpdateCredential handles the update credential endpoint.
func (s *Server) handleUpdateCredential(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var cred struct {
		IP       string `json:"ip"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&cred); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Encrypt sensitive data
	encryptedIP, err := encryptString(cred.IP)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	encryptedUsername, err := encryptString(cred.Username)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	encryptedPassword, err := encryptString(cred.Password)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	// Update in database
	_, err = s.db.Exec(
		`UPDATE credentials SET ip=$1, username=$2, password=$3 WHERE id=$4`,
		encryptedIP, encryptedUsername, encryptedPassword, id,
	)

	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("credential updated: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":       id,
			"ip":       cred.IP,
			"username": cred.Username,
			"password": cred.Password,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleDeleteCredential handles the delete credential endpoint.
func (s *Server) handleDeleteCredential(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Delete from database
	_, err = s.db.Exec(`DELETE FROM credentials WHERE id=$1`, id)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("credential deleted: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id": id,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleBulkDeleteCredentials handles the bulk delete credentials endpoint.
func (s *Server) handleBulkDeleteCredentials(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int `json:"ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	if len(req.IDs) == 0 {
		s.writeError(w, http.StatusBadRequest, "no ids provided")
		return
	}

	// Convert IDs to string for SQL IN clause
	idStrs := make([]string, len(req.IDs))
	for i, id := range req.IDs {
		idStrs[i] = strconv.Itoa(id)
	}

	// Delete from database
	query := fmt.Sprintf(`DELETE FROM credentials WHERE id IN (%s)`, 
		"$"+strconv.Itoa(1))
	_, err := s.db.Exec(query, req.IDs[0])
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("bulk deleted %d credentials", len(req.IDs)), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"count": len(req.IDs),
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleGetProxies handles the proxies endpoint.
func (s *Server) handleGetProxies(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 10

	// Parse pagination parameters
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	// Get proxies from database
	proxies, total, err := s.db.GetProxiesWithPagination(page, pageSize)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Build pagination response
	pagination := BuildPaginationResponse(page, pageSize, total)

	resp := APIResponse{
		Success: true,
		Data:    proxies,
	}
	s.writeJSONWithMeta(w, http.StatusOK, resp, pagination)
}

// handleCreateProxy handles the create proxy endpoint.
func (s *Server) handleCreateProxy(w http.ResponseWriter, r *http.Request) {
	var proxy struct {
		Address  string `json:"address"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&proxy); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Encrypt sensitive data
	encryptedAddress, err := encryptString(proxy.Address)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	encryptedUsername, err := encryptString(proxy.Username)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	encryptedPassword, err := encryptString(proxy.Password)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	// Insert into database
	var id int
	err = s.db.QueryRow(
		`INSERT INTO proxies(address, username, password) VALUES($1, $2, $3) RETURNING id`,
		encryptedAddress, encryptedUsername, encryptedPassword,
	).Scan(&id)

	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("proxy created: %s", proxy.Address), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":       id,
			"address":  proxy.Address,
			"username": proxy.Username,
			"password": proxy.Password,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleUpdateProxy handles the update proxy endpoint.
func (s *Server) handleUpdateProxy(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var proxy struct {
		Address  string `json:"address"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&proxy); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Encrypt sensitive data
	encryptedAddress, err := encryptString(proxy.Address)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	encryptedUsername, err := encryptString(proxy.Username)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	encryptedPassword, err := encryptString(proxy.Password)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "encryption error")
		return
	}

	// Update in database
	_, err = s.db.Exec(
		`UPDATE proxies SET address=$1, username=$2, password=$3 WHERE id=$4`,
		encryptedAddress, encryptedUsername, encryptedPassword, id,
	)

	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("proxy updated: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":       id,
			"address":  proxy.Address,
			"username": proxy.Username,
			"password": proxy.Password,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleDeleteProxy handles the delete proxy endpoint.
func (s *Server) handleDeleteProxy(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Delete from database
	_, err = s.db.Exec(`DELETE FROM proxies WHERE id=$1`, id)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("proxy deleted: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id": id,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleGetTasks handles the tasks endpoint.
func (s *Server) handleGetTasks(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 10

	// Parse pagination parameters
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	// Get tasks from database
	tasks, total, err := s.db.GetTasksWithPagination(page, pageSize)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Build pagination response
	pagination := BuildPaginationResponse(page, pageSize, total)

	resp := APIResponse{
		Success: true,
		Data:    tasks,
	}
	s.writeJSONWithMeta(w, http.StatusOK, resp, pagination)
}

// handleCreateTask handles the create task endpoint.
func (s *Server) handleCreateTask(w http.ResponseWriter, r *http.Request) {
	var task struct {
		VPNType     string `json:"vpn_type"`
		VendorURLID int    `json:"vendor_url_id"`
		Server      string `json:"server"`
		Status      string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Insert into database
	var id int
	err := s.db.QueryRow(
		`INSERT INTO tasks(vpn_type, vendor_url_id, server, status) VALUES($1, $2, $3, $4) RETURNING id`,
		task.VPNType, task.VendorURLID, task.Server, task.Status,
	).Scan(&id)

	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("task created: %s", task.VPNType), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":            id,
			"vpn_type":      task.VPNType,
			"vendor_url_id": task.VendorURLID,
			"server":        task.Server,
			"status":        task.Status,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleUpdateTask handles the update task endpoint.
func (s *Server) handleUpdateTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var task struct {
		VPNType     string `json:"vpn_type"`
		VendorURLID int    `json:"vendor_url_id"`
		Server      string `json:"server"`
		Status      string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Update in database
	_, err = s.db.Exec(
		`UPDATE tasks SET vpn_type=$1, vendor_url_id=$2, server=$3, status=$4 WHERE id=$5`,
		task.VPNType, task.VendorURLID, task.Server, task.Status, id,
	)

	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("task updated: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":            id,
			"vpn_type":      task.VPNType,
			"vendor_url_id": task.VendorURLID,
			"server":        task.Server,
			"status":        task.Status,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleDeleteTask handles the delete task endpoint.
func (s *Server) handleDeleteTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Delete from database
	_, err = s.db.Exec(`DELETE FROM tasks WHERE id=$1`, id)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("task deleted: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id": id,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleBulkDeleteTasks handles the bulk delete tasks endpoint.
func (s *Server) handleBulkDeleteTasks(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int `json:"ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	if len(req.IDs) == 0 {
		s.writeError(w, http.StatusBadRequest, "no ids provided")
		return
	}

	// Convert IDs to string for SQL IN clause
	idStrs := make([]string, len(req.IDs))
	for i, id := range req.IDs {
		idStrs[i] = strconv.Itoa(id)
	}

	// Delete from database
	query := fmt.Sprintf(`DELETE FROM tasks WHERE id IN (%s)`, 
		"$"+strconv.Itoa(1))
	_, err := s.db.Exec(query, req.IDs[0])
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("bulk deleted %d tasks", len(req.IDs)), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"count": len(req.IDs),
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleGetVendorURLs handles the vendor URLs endpoint.
func (s *Server) handleGetVendorURLs(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 10

	// Parse pagination parameters
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	// Get vendor URLs from database
	vendorURLs, total, err := s.db.GetVendorURLsWithPagination(page, pageSize)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Build pagination response
	pagination := BuildPaginationResponse(page, pageSize, total)

	resp := APIResponse{
		Success: true,
		Data:    vendorURLs,
	}
	s.writeJSONWithMeta(w, http.StatusOK, resp, pagination)
}

// handleCreateVendorURL handles the create vendor URL endpoint.
func (s *Server) handleCreateVendorURL(w http.ResponseWriter, r *http.Request) {
	var vendorURL struct {
		URL string `json:"url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&vendorURL); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Insert into database
	var id int
	err := s.db.QueryRow(
		`INSERT INTO vendor_urls(url) VALUES($1) RETURNING id`,
		vendorURL.URL,
	).Scan(&id)

	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("vendor URL created: %s", vendorURL.URL), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":  id,
			"url": vendorURL.URL,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleUpdateVendorURL handles the update vendor URL endpoint.
func (s *Server) handleUpdateVendorURL(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var vendorURL struct {
		URL string `json:"url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&vendorURL); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Update in database
	_, err = s.db.Exec(
		`UPDATE vendor_urls SET url=$1 WHERE id=$2`,
		vendorURL.URL, id,
	)

	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("vendor URL updated: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":  id,
			"url": vendorURL.URL,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleDeleteVendorURL handles the delete vendor URL endpoint.
func (s *Server) handleDeleteVendorURL(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Delete from database
	_, err = s.db.Exec(`DELETE FROM vendor_urls WHERE id=$1`, id)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("vendor URL deleted: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id": id,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleGetLogs handles the logs endpoint.
func (s *Server) handleGetLogs(w http.ResponseWriter, r *http.Request) {
	limit := 100

	// Parse limit parameter
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	// Get logs from database
	rows, err := s.db.Query(`SELECT timestamp, level, message, source FROM logs ORDER BY timestamp DESC LIMIT $1`, limit)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, fmt.Sprintf("database error: %v", err))
		return
	}
	defer rows.Close()

	logs := []map[string]interface{}{}
	for rows.Next() {
		var ts time.Time
		var level, message, source string
		if err := rows.Scan(&ts, &level, &message, &source); err != nil {
			continue
		}

		logs = append(logs, map[string]interface{}{
			"timestamp": ts.Format(time.RFC3339),
			"level":     level,
			"message":   message,
			"source":    source,
		})
	}

	resp := APIResponse{
		Success: true,
		Data:    logs,
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleStartScanner handles the start scanner endpoint.
func (s *Server) handleStartScanner(w http.ResponseWriter, r *http.Request) {
	var req struct {
		VPNType string `json:"vpn_type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("scanner started: %s", req.VPNType), "api")

	// Broadcast to WebSocket clients
	s.wsServer.BroadcastMessage("scanner_started", map[string]string{
		"status":   "success",
		"vpn_type": req.VPNType,
	})

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"status":   "started",
			"vpn_type": req.VPNType,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleStopScanner handles the stop scanner endpoint.
func (s *Server) handleStopScanner(w http.ResponseWriter, r *http.Request) {
	var req struct {
		VPNType string `json:"vpn_type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("scanner stopped: %s", req.VPNType), "api")

	// Broadcast to WebSocket clients
	s.wsServer.BroadcastMessage("scanner_stopped", map[string]string{
		"status":   "success",
		"vpn_type": req.VPNType,
	})

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"status":   "stopped",
			"vpn_type": req.VPNType,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleUpdateConfig handles the update config endpoint.
func (s *Server) handleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	var config map[string]interface{}

	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", "config updated", "api")

	// Broadcast to WebSocket clients
	s.wsServer.BroadcastMessage("config_update", config)

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"status": "updated",
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleGetScheduledTasks handles the scheduled tasks endpoint.
func (s *Server) handleGetScheduledTasks(w http.ResponseWriter, r *http.Request) {
	// Mock response for scheduled tasks
	tasks := []map[string]interface{}{
		{
			"id":                1,
			"title":             "Daily Fortinet Scan",
			"description":       "Scan Fortinet VPNs every day",
			"taskType":          "scan",
			"vpnType":           "fortinet",
			"scheduledDateTime": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
			"repeat":            "daily",
			"servers":           []string{"192.168.1.100", "10.0.0.50"},
			"active":            true,
			"executed":          false,
			"createdAt":         time.Now().Format(time.RFC3339),
		},
	}

	resp := APIResponse{
		Success: true,
		Data:    tasks,
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleCreateScheduledTask handles the create scheduled task endpoint.
func (s *Server) handleCreateScheduledTask(w http.ResponseWriter, r *http.Request) {
	var task map[string]interface{}

	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", "scheduled task created", "api")

	// Add ID to task
	task["id"] = 2

	resp := APIResponse{
		Success: true,
		Data:    task,
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleUpdateScheduledTask handles the update scheduled task endpoint.
func (s *Server) handleUpdateScheduledTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var task map[string]interface{}

	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		s.writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request: %v", err))
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("scheduled task updated: %d", id), "api")

	// Add ID to task
	task["id"] = id

	resp := APIResponse{
		Success: true,
		Data:    task,
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// handleDeleteScheduledTask handles the delete scheduled task endpoint.
func (s *Server) handleDeleteScheduledTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Log the action
	s.logEvent("info", fmt.Sprintf("scheduled task deleted: %d", id), "api")

	resp := APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id": id,
		},
	}
	s.writeJSON(w, http.StatusOK, resp)
}

// writeJSON writes a JSON response.
func (s *Server) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("error encoding response: %v", err)
	}
}

// writeJSONWithMeta writes a JSON response with metadata.
func (s *Server) writeJSONWithMeta(w http.ResponseWriter, status int, data interface{}, meta interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	// Create a response with data and metadata
	response := struct {
		Success bool        `json:"success"`
		Data    interface{} `json:"data,omitempty"`
		Error   string      `json:"error,omitempty"`
		Meta    interface{} `json:"meta,omitempty"`
	}{
		Success: true,
		Data:    data,
		Meta:    meta,
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("error encoding response: %v", err)
	}
}

// writeError writes an error response.
func (s *Server) writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := APIResponse{
		Success: false,
		Error:   message,
	}
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("error encoding error response: %v", err)
	}
}