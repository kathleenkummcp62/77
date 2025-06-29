package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	dbpkg "vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

// setupCredsServer connects to an in-memory database using db.Connect.
func setupCredsServer(t *testing.T) (*Server, func()) {
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

// checkTables verifies that all expected tables were created.
func checkTables(t *testing.T, db *sql.DB) {
	tables := []string{"vendor_urls", "credentials", "proxies", "tasks", "logs"}
	for _, tbl := range tables {
		var exists bool
		err := db.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name=$1)`, tbl).Scan(&exists)
		if err != nil {
			t.Fatalf("check table %s: %v", tbl, err)
		}
		if !exists {
			t.Fatalf("table %s not created", tbl)
		}
	}
}

// TestCredentialHandlers exercises the credentials CRUD endpoints.
func TestCredentialHandlers(t *testing.T) {
	srv, cleanup := setupCredsServer(t)
	defer cleanup()

	checkTables(t, srv.db.DB)

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	// empty list
	resp, err := http.Get(ts.URL + "/api/credentials")
	if err != nil {
		t.Fatalf("get credentials: %v", err)
	}
	defer resp.Body.Close()
	var out struct {
		Success bool                     `json:"success"`
		Data    []map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !out.Success || len(out.Data) != 0 {
		t.Fatalf("expected empty list")
	}

	// create
	body := bytes.NewBufferString(`{"ip":"1.1.1.1","username":"u","password":"p"}`)
	resp, err = http.Post(ts.URL+"/api/credentials", "application/json", body)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	var postResp struct {
		Success bool
		Data    map[string]interface{}
	}
	if err := json.NewDecoder(resp.Body).Decode(&postResp); err != nil {
		t.Fatalf("decode post: %v", err)
	}
	if !postResp.Success {
		t.Fatalf("post failed")
	}
	id := int(postResp.Data["id"].(float64))

	// update
	upd := map[string]string{"ip": "2.2.2.2", "username": "u2", "password": "p2"}
	ub, _ := json.Marshal(upd)
	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/credentials/"+strconv.Itoa(id), bytes.NewReader(ub))
	req.Header.Set("Content-Type", "application/json")
	resp2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("put status %d", resp2.StatusCode)
	}

	// delete
	req, _ = http.NewRequest(http.MethodDelete, ts.URL+"/api/credentials/"+strconv.Itoa(id), nil)
	resp2, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("delete status %d", resp2.StatusCode)
	}
}

// TestCredentialInvalidJSON tests error handling on malformed payloads.
func TestCredentialInvalidJSON(t *testing.T) {
	srv, cleanup := setupCredsServer(t)
	defer cleanup()

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	resp, err := http.Post(ts.URL+"/api/credentials", "application/json", bytes.NewBufferString("{"))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	var out APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Success || out.Error == "" {
		t.Fatalf("expected error response")
	}

	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/credentials/1", bytes.NewBufferString("{"))
	req.Header.Set("Content-Type", "application/json")
	resp2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	defer resp2.Body.Close()
	out = APIResponse{}
	json.NewDecoder(resp2.Body).Decode(&out)
	if out.Success || out.Error == "" {
		t.Fatalf("expected error on update")
	}
}
