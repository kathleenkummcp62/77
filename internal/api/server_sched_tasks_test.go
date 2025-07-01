package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	dbpkg "vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

func setupSchedServer(t *testing.T) (*Server, func()) {
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

func TestScheduledTasksHandlers(t *testing.T) {
	srv, cleanup := setupSchedServer(t)
	defer cleanup()

	if !tableExists(t, srv.db.DB, "scheduled_tasks") {
		t.Fatalf("expected scheduled_tasks table")
	}

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/api/scheduled_tasks")
	if err != nil {
		t.Fatalf("get empty: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var list struct {
		Success bool          `json:"success"`
		Data    []interface{} `json:"data"`
	}
	json.NewDecoder(resp.Body).Decode(&list)
	if !list.Success || len(list.Data) != 0 {
		t.Fatalf("expected empty list")
	}

	body := bytes.NewBufferString(`{"title":"t1","description":"d","taskType":"scan","vpnType":"openvpn","scheduledDateTime":"2025-01-02T15:04:05Z","repeat":"once","servers":["1.1.1.1"],"active":true,"executed":false}`)
	resp, err = http.Post(ts.URL+"/api/scheduled_tasks", "application/json", body)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("post status %d", resp.StatusCode)
	}
	var pr struct {
		Success bool
		Data    map[string]int
	}
	json.NewDecoder(resp.Body).Decode(&pr)
	if !pr.Success {
		t.Fatalf("create failed")
	}
	id := pr.Data["id"]

	upd := `{"title":"t2","description":"d2","taskType":"scan","vpnType":"openvpn","scheduledDateTime":"2025-01-03T10:00:00Z","repeat":"once","servers":["1.1.1.1"],"active":false,"executed":false}`
	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/scheduled_tasks/"+strconv.Itoa(id), bytes.NewBufferString(upd))
	req.Header.Set("Content-Type", "application/json")
	resp2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("put status %d", resp2.StatusCode)
	}

	req, _ = http.NewRequest(http.MethodDelete, ts.URL+"/api/scheduled_tasks/"+strconv.Itoa(id), nil)
	resp2, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("del status %d", resp2.StatusCode)
	}
}
