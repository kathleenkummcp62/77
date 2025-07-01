package api

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "os"
    "testing"

    dbpkg "vpn-bruteforce-client/internal/db"
    "vpn-bruteforce-client/internal/stats"
    "gopkg.in/yaml.v3"
)

// reuse setupAPIServer from server_crud_test.go by redefining here
func setupMiscServer(t *testing.T) (*Server, func()) {
    t.Helper()
    if os.Geteuid() == 0 {
        t.Skip("cannot run embedded postgres as root")
    }
    cfg := dbpkg.Config{DSN: "", User: "postgres", Password: "postgres", Name: "testdb"}
    db, err := dbpkg.Connect(cfg)
    if err != nil {
        t.Fatalf("connect: %v", err)
    }
    srv := NewServer(stats.New(), 0, db)
    return srv, func() { db.Close() }
}

func TestStartStopHandlers(t *testing.T) {
    srv, cleanup := setupMiscServer(t)
    defer cleanup()
    ts := httptest.NewServer(srv.router)
    defer ts.Close()

    body := bytes.NewBufferString(`{"vpn_type":"openvpn"}`)
    resp, err := http.Post(ts.URL+"/api/start", "application/json", body)
    if err != nil {
        t.Fatalf("post start: %v", err)
    }
    defer resp.Body.Close()
    var out APIResponse
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
        t.Fatalf("decode: %v", err)
    }
    if !out.Success {
        t.Fatalf("expected success")
    }
    data := out.Data.(map[string]interface{})
    if data["status"] != "started" {
        t.Fatalf("unexpected status %v", data["status"])
    }

    body = bytes.NewBufferString(`{"vpn_type":"openvpn"}`)
    resp, err = http.Post(ts.URL+"/api/stop", "application/json", body)
    if err != nil {
        t.Fatalf("post stop: %v", err)
    }
    defer resp.Body.Close()
    out = APIResponse{}
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
        t.Fatalf("decode stop: %v", err)
    }
    if !out.Success {
        t.Fatalf("expected success on stop")
    }
}

func TestConfigHandlers(t *testing.T) {
    srv, cleanup := setupMiscServer(t)
    defer cleanup()

    dir := t.TempDir()
    cwd, _ := os.Getwd()
    os.Chdir(dir)
    defer os.Chdir(cwd)
    os.WriteFile("config.yaml", []byte("threads: 10\n"), 0644)

    ts := httptest.NewServer(srv.router)
    defer ts.Close()

    // GET existing config
    resp, err := http.Get(ts.URL + "/api/config")
    if err != nil {
        t.Fatalf("get: %v", err)
    }
    defer resp.Body.Close()
    var out APIResponse
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
        t.Fatalf("decode: %v", err)
    }
    if !out.Success {
        t.Fatalf("expected success")
    }

    // POST update
    body := bytes.NewBufferString(`{"threads":20}`)
    resp2, err := http.Post(ts.URL+"/api/config", "application/json", body)
    if err != nil {
        t.Fatalf("post config: %v", err)
    }
    resp2.Body.Close()
    if resp2.StatusCode != http.StatusOK {
        t.Fatalf("status %d", resp2.StatusCode)
    }

    data, err := os.ReadFile("config.yaml")
    if err != nil {
        t.Fatalf("read config: %v", err)
    }
    var cfg struct{ Threads int `yaml:"threads"` }
    if err := yaml.Unmarshal(data, &cfg); err != nil {
        t.Fatalf("unmarshal: %v", err)
    }
    if cfg.Threads != 20 {
        t.Fatalf("expected threads 20, got %d", cfg.Threads)
    }
}

