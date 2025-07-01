package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"vpn-bruteforce-client/internal/aggregator"
	"vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

type Server struct {
	clients    map[*websocket.Conn]bool
	clientsMux sync.RWMutex
	upgrader   websocket.Upgrader
	stats      *stats.Stats
	db         *db.DB
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
}

// logEvent inserts an entry into the logs table when a database connection is available.
func (s *Server) logEvent(level, msg, src string) {
	if s == nil || s.db == nil {
		return
	}
	if err := s.db.InsertLog(level, msg, src); err != nil {
		log.Printf("log event error: %v", err)
	}
}

type Message struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
}

type StatsData struct {
	Goods     int64   `json:"goods"`
	Bads      int64   `json:"bads"`
	Errors    int64   `json:"errors"`
	Offline   int64   `json:"offline"`
	IPBlock   int64   `json:"ipblock"`
	Processed int64   `json:"processed"`
	RPS       int64   `json:"rps"`
	AvgRPS    int64   `json:"avg_rps"`
	PeakRPS   int64   `json:"peak_rps"`
	Threads   int64   `json:"threads"`
	Uptime    int64   `json:"uptime"`
	Success   float64 `json:"success_rate"`
}

type ServerInfo struct {
	IP        string `json:"ip"`
	Status    string `json:"status"`
	Uptime    string `json:"uptime"`
	CPU       int    `json:"cpu"`
	Memory    int    `json:"memory"`
	Disk      int    `json:"disk"`
	Speed     string `json:"speed"`
	Processed int    `json:"processed"`
	Goods     int    `json:"goods"`
	Bads      int    `json:"bads"`
	Errors    int    `json:"errors"`
	Progress  int    `json:"progress"`
	Task      string `json:"current_task"`
}

func NewServer(stats *stats.Stats, database *db.DB) *Server {
	return &Server{
		clients: make(map[*websocket.Conn]bool),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Get allowed origins from environment
				allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
				if allowedOrigins == "" {
					return true // Allow all origins for development
				}
				
				// Check if origin is in allowed list
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true // Allow requests with no origin
				}
				
				for _, allowed := range strings.Split(allowedOrigins, ",") {
					if strings.TrimSpace(allowed) == origin {
						return true
					}
				}
				
				log.Printf("WebSocket connection rejected from origin: %s", origin)
				return false
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
		stats:      stats,
		db:         database,
		broadcast:  make(chan []byte, 256),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

func (s *Server) Start() {
	go s.handleConnections()
	go s.broadcastStats()
}

func (s *Server) handleConnections() {
	for {
		select {
		case client := <-s.register:
			s.clientsMux.Lock()
			s.clients[client] = true
			s.clientsMux.Unlock()
			log.Printf("WebSocket client connected. Total: %d", len(s.clients))
			s.logEvent("info", "websocket client connected", "websocket")

			// Send initial data to new client
			s.sendInitialData(client)

		case client := <-s.unregister:
			s.clientsMux.Lock()
			if _, ok := s.clients[client]; ok {
				delete(s.clients, client)
				client.Close()
			}
			s.clientsMux.Unlock()
			log.Printf("WebSocket client disconnected. Total: %d", len(s.clients))
			s.logEvent("info", "websocket client disconnected", "websocket")

		case message := <-s.broadcast:
			s.clientsMux.Lock()
			for client := range s.clients {
				if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
					log.Printf("WebSocket write error: %v", err)
					client.Close()
					delete(s.clients, client)
				}
			}
			s.clientsMux.Unlock()
		}
	}
}

func (s *Server) broadcastStats() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		statsData := StatsData{
			Goods:     s.stats.GetGoods(),
			Bads:      s.stats.GetBads(),
			Errors:    s.stats.GetErrors(),
			Offline:   s.stats.GetOffline(),
			IPBlock:   s.stats.GetIPBlock(),
			Processed: s.stats.GetProcessed(),
			RPS:       s.stats.GetRPS(),
			AvgRPS:    s.stats.GetAvgRPS(),
			PeakRPS:   s.stats.GetPeakRPS(),
			Threads:   s.stats.GetThreads(),
			Uptime:    s.stats.GetUptime(),
			Success:   s.stats.GetSuccessRate(),
		}

		message := Message{
			Type:      "stats_update",
			Data:      statsData,
			Timestamp: time.Now().Unix(),
		}

		data, err := json.Marshal(message)
		if err != nil {
			log.Printf("Error marshaling stats: %v", err)
			continue
		}

		select {
		case s.broadcast <- data:
		default:
			// Channel full, skip this update
		}
	}
}

func (s *Server) sendInitialData(client *websocket.Conn) {
	// Send current stats
	statsData := StatsData{
		Goods:     s.stats.GetGoods(),
		Bads:      s.stats.GetBads(),
		Errors:    s.stats.GetErrors(),
		Offline:   s.stats.GetOffline(),
		IPBlock:   s.stats.GetIPBlock(),
		Processed: s.stats.GetProcessed(),
		RPS:       s.stats.GetRPS(),
		AvgRPS:    s.stats.GetAvgRPS(),
		PeakRPS:   s.stats.GetPeakRPS(),
		Threads:   s.stats.GetThreads(),
		Uptime:    s.stats.GetUptime(),
		Success:   s.stats.GetSuccessRate(),
	}

	message := Message{
		Type:      "initial_stats",
		Data:      statsData,
		Timestamp: time.Now().Unix(),
	}

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling initial stats: %v", err)
	} else if err := client.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("Error sending initial stats: %v", err)
	}

	// Send server info
	servers := s.getServerInfo()
	serverMessage := Message{
		Type:      "server_info",
		Data:      servers,
		Timestamp: time.Now().Unix(),
	}

	serverData, err := json.Marshal(serverMessage)
	if err != nil {
		log.Printf("Error marshaling server info: %v", err)
		return
	}
	if err := client.WriteMessage(websocket.TextMessage, serverData); err != nil {
		log.Printf("Error sending server info: %v", err)
	}
}

func (s *Server) getServerInfo() []ServerInfo {
	dir := os.Getenv("STATS_DIR")
	if dir == "" {
		dir = "."
	}
	aggr := aggregator.New(dir)
	infos, err := aggr.GetServerInfo()
	if err != nil {
		log.Printf("aggregator error: %v", err)
		s.logEvent("error", fmt.Sprintf("aggregator error: %v", err), "websocket")
		return nil
	}

	result := make([]ServerInfo, len(infos))
	for i, inf := range infos {
		result[i] = ServerInfo(inf)
	}
	return result
}

// Authenticate WebSocket connection
func (s *Server) authenticateConnection(r *http.Request) bool {
	// Get token from query parameter
	token := r.URL.Query().Get("token")
	if token == "" {
		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}
	
	// Skip authentication in development mode
	if os.Getenv("NODE_ENV") != "production" {
		return true
	}
	
	// Check if token is required
	authToken := os.Getenv("API_AUTH_TOKEN")
	if authToken == "" {
		return true
	}
	
	// Validate token
	return token == authToken
}

func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Authenticate connection
	if !s.authenticateConnection(r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		s.logEvent("error", "websocket authentication failed", "websocket")
		return
	}
	
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		s.logEvent("error", fmt.Sprintf("websocket upgrade error: %v", err), "websocket")
		return
	}

	// Set read deadline to detect stale connections
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	
	// Set ping handler to extend read deadline
	conn.SetPingHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return conn.WriteControl(websocket.PongMessage, []byte{}, time.Now().Add(10*time.Second))
	})

	s.register <- conn

	// Handle incoming messages
	go func() {
		defer func() {
			s.unregister <- conn
		}()

		for {
			var msg Message
			err := conn.ReadJSON(&msg)
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket error: %v", err)
				}
				break
			}

			// Handle different message types
			s.handleMessage(conn, msg)
		}
	}()
	
	// Start ping-pong to keep connection alive
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(10*time.Second)); err != nil {
					log.Printf("WebSocket ping error: %v", err)
					return
				}
			}
		}
	}()
}

func (s *Server) handleMessage(conn *websocket.Conn, msg Message) {
	switch msg.Type {
	case "start_scanner":
		// Handle start scanner command
		vpnType := ""
		if m, ok := msg.Data.(map[string]interface{}); ok {
			if v, ok := m["vpn_type"].(string); ok {
				vpnType = v
			}
		} else if v, ok := msg.Data.(string); ok {
			vpnType = v
		}
		response := Message{
			Type:      "scanner_started",
			Data:      map[string]string{"status": "success", "scanner": vpnType},
			Timestamp: time.Now().Unix(),
		}
		data, _ := json.Marshal(response)
		conn.WriteMessage(websocket.TextMessage, data)

	case "stop_scanner":
		// Handle stop scanner command
		vpnType := ""
		if m, ok := msg.Data.(map[string]interface{}); ok {
			if v, ok := m["vpn_type"].(string); ok {
				vpnType = v
			}
		} else if v, ok := msg.Data.(string); ok {
			vpnType = v
		}
		response := Message{
			Type:      "scanner_stopped",
			Data:      map[string]string{"status": "success", "scanner": vpnType},
			Timestamp: time.Now().Unix(),
		}
		data, _ := json.Marshal(response)
		conn.WriteMessage(websocket.TextMessage, data)

	case "get_logs":
		limit := 100
		if m, ok := msg.Data.(map[string]interface{}); ok {
			if v, ok := m["limit"].(float64); ok {
				limit = int(v)
			}
		}

		logs, err := s.getLogs(limit)
		if err != nil {
			resp := Message{Type: "error", Data: map[string]string{"message": err.Error()}, Timestamp: time.Now().Unix()}
			if data, err := json.Marshal(resp); err == nil {
				conn.WriteMessage(websocket.TextMessage, data)
			}
			return
		}

		response := Message{
			Type:      "logs_data",
			Data:      logs,
			Timestamp: time.Now().Unix(),
		}
		data, _ := json.Marshal(response)
		conn.WriteMessage(websocket.TextMessage, data)

	default:
		log.Printf("Unknown message type: %s", msg.Type)
		s.logEvent("warn", fmt.Sprintf("unknown message: %s", msg.Type), "websocket")
	}
}

func (s *Server) BroadcastMessage(msgType string, data interface{}) {
	message := Message{
		Type:      msgType,
		Data:      data,
		Timestamp: time.Now().Unix(),
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling broadcast message: %v", err)
		return
	}

	select {
	case s.broadcast <- jsonData:
	default:
		// Channel full, skip this message
	}
}

// getLogs retrieves recent log entries either from the database or from the
// default log file when the database is unavailable.
func (s *Server) getLogs(limit int) ([]map[string]interface{}, error) {
	if limit <= 0 {
		limit = 100
	}

	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	rows, err := s.db.Query(`SELECT timestamp, level, message, source FROM logs ORDER BY timestamp DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
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
	return logs, nil
}