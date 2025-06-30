package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	dbpkg "vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

func setupLogServer(t *testing.T) (*Server, func()) {
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

func TestInsertLogAndEndpoint(t *testing.T) {
	srv, cleanup := setupLogServer(t)
	defer cleanup()

	srv.InsertLog("info", "hello world", "test")

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/api/logs?limit=1")
	if err != nil {
		t.Fatalf("get logs: %v", err)
	}
	defer resp.Body.Close()
	var out struct {
		Success bool                     `json:"success"`
		Data    []map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !out.Success || len(out.Data) == 0 {
		t.Fatalf("expected log data")
	}
	if out.Data[0]["message"] != "hello world" {
		t.Fatalf("unexpected message: %v", out.Data[0]["message"])
	}
}
