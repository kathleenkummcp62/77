package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"vpn-bruteforce-client/internal/aggregator"
	"vpn-bruteforce-client/internal/stats"
)

type Server struct {
	clients    map[*websocket.Conn]bool
	clientsMux sync.RWMutex
	upgrader   websocket.Upgrader
	stats      *stats.Stats
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
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

func NewServer(stats *stats.Stats) *Server {
	return &Server{
		clients: make(map[*websocket.Conn]bool),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for development
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
		stats:      stats,
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

		case message := <-s.broadcast:
			s.clientsMux.Lock()
			for client := range s.clients {
				if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
					delete(s.clients, client)
					client.Close()
				}
			}
			s.clientsMux.Unlock()
		}
	}
}

func (s *Server) broadcastStats() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
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
	aggr := aggregator.New(".")
	infos, err := aggr.GetServerInfo()
	if err != nil {
		log.Printf("aggregator error: %v", err)
		return nil
	}

	result := make([]ServerInfo, len(infos))
	for i, inf := range infos {
		result[i] = ServerInfo(inf)
	}
	return result
}

func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

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
		// Handle log request
		logs := []string{
			"[INFO] Scanner started successfully",
			"[SUCCESS] Found valid credential: 192.168.1.1;admin;password",
			"[ERROR] Connection timeout for 192.168.1.2",
			"[INFO] Processing rate: 2500 req/s",
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
