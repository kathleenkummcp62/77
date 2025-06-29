package websocket

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	gw "github.com/gorilla/websocket"
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

func TestHandleMessageStartScanner(t *testing.T) {
	s := NewServer(stats.New(), nil)
	serverConn, clientConn, cleanup := newTestWSPair(t, s)
	defer cleanup()

	tests := []struct {
		name string
		data json.RawMessage
	}{
		{"string", json.RawMessage(`"openvpn"`)},
		{"object", json.RawMessage(`{"vpn_type":"openvpn"}`)},
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
			if resp.Data["status"] != "success" || resp.Data["vpn_type"] != "openvpn" {
				t.Fatalf("unexpected data: %v", resp.Data)
			}
		})
	}
}

func TestHandleMessageStartScannerMalformed(t *testing.T) {
	s := NewServer(stats.New(), nil)
	serverConn, clientConn, cleanup := newTestWSPair(t, s)
	defer cleanup()

	msg := Message{Type: "start_scanner", Data: json.RawMessage(`123`)}
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
	if resp.Data["status"] != "success" || resp.Data["vpn_type"] != "" {
		t.Fatalf("unexpected data: %v", resp.Data)
	}
}

func TestHandleMessageGetLogsMalformed(t *testing.T) {
	s := NewServer(stats.New(), nil)
	serverConn, clientConn, cleanup := newTestWSPair(t, s)
	defer cleanup()

	tmpDir := t.TempDir()
	logPath := filepath.Join(tmpDir, "test.log")
	os.WriteFile(logPath, []byte("a\nb\n"), 0644)
	os.Setenv("LOG_FILE", logPath)
	defer os.Unsetenv("LOG_FILE")

	msg := Message{Type: "get_logs", Data: json.RawMessage(`"oops"`)}
	s.handleMessage(serverConn, msg)

	_, respData, err := clientConn.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var resp struct {
		Type string        `json:"type"`
		Data []interface{} `json:"data"`
	}
	if err := json.Unmarshal(respData, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Type != "logs_data" {
		t.Fatalf("type=%s", resp.Type)
	}
	if len(resp.Data) != 2 {
		t.Fatalf("unexpected data length: %d", len(resp.Data))
	}
}
