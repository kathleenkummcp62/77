package websocket

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/fergusstrange/embedded-postgres"
	gw "github.com/gorilla/websocket"
	_ "github.com/jackc/pgx/v5/stdlib"
	dbpkg "vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

func newTestWSPair(t *testing.T, s *Server) (*gw.Conn, *gw.Conn, func()) {
	done := make(chan *gw.Conn, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := s.upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Fatalf("upgrade: %v", err)
		}
		done <- c
	}))

	url := "ws" + strings.TrimPrefix(srv.URL, "http")
	client, _, err := gw.DefaultDialer.Dial(url, nil)
	if err != nil {
		srv.Close()
		t.Fatalf("dial: %v", err)
	}
	server := <-done

	cleanup := func() {
		client.Close()
		server.Close()
		srv.Close()
	}
	return server, client, cleanup
}

func setupWSServer(t *testing.T) (*Server, func()) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	pg := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().Port(5441).Database("testdb").Username("postgres").Password("postgres"))
	if err := pg.Start(); err != nil {
		t.Fatalf("failed to start embedded postgres: %v", err)
	}
	dsn := "postgres://postgres:postgres@localhost:5441/testdb?sslmode=disable"
	sqlDB, err := sql.Open("pgx", dsn)
	if err != nil {
		pg.Stop()
		t.Fatalf("failed to open db: %v", err)
	}
	db := &dbpkg.DB{DB: sqlDB}
	if err := dbpkg.InitSchema(db); err != nil {
		pg.Stop()
		sqlDB.Close()
		t.Fatalf("init schema: %v", err)
	}
	srv := NewServer(stats.New(), db)
	return srv, func() {
		sqlDB.Close()
		pg.Stop()
	}
}

func TestHandleMessageStartScanner(t *testing.T) {
	s := NewServer(stats.New(), nil)
	serverConn, clientConn, cleanup := newTestWSPair(t, s)
	defer cleanup()

	tests := []struct {
		name string
		data interface{}
	}{
		{"string", "openvpn"},
		{"object", map[string]interface{}{"vpn_type": "openvpn"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msg := Message{Type: "start_scanner", Data: tt.data}
			s.handleMessage(serverConn, msg)

			_, respData, err := clientConn.ReadMessage()
			if err != nil {
				t.Fatalf("read: %v", err)
			}
			var resp struct {
				Type string            `json:"type"`
				Data map[string]string `json:"data"`
			}
			if err := json.Unmarshal(respData, &resp); err != nil {
				t.Fatalf("unmarshal: %v", err)
			}
			if resp.Type != "scanner_started" {
				t.Fatalf("type=%s", resp.Type)
			}
			if resp.Data["status"] != "success" || resp.Data["scanner"] != "openvpn" {
				t.Fatalf("unexpected data: %v", resp.Data)
			}
		})
	}
}

func TestWebSocketGetLogs(t *testing.T) {
	srv, cleanup := setupWSServer(t)
	defer cleanup()

	srv.logEvent("info", "ws-log", "test")

	serverConn, clientConn, pairCleanup := newTestWSPair(t, srv)
	defer pairCleanup()

	msg := Message{Type: "get_logs", Data: map[string]interface{}{"limit": 5}}
	srv.handleMessage(serverConn, msg)

	_, respData, err := clientConn.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var resp struct {
		Type string                   `json:"type"`
		Data []map[string]interface{} `json:"data"`
	}
	if err := json.Unmarshal(respData, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Type != "logs_data" || len(resp.Data) == 0 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if resp.Data[0]["message"] != "ws-log" {
		t.Fatalf("unexpected message: %v", resp.Data[0]["message"])
	}
}
