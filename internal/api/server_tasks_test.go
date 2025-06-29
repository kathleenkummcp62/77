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

// setupTasksServer connects to an in-memory database using db.Connect and
// returns a Server instance along with a cleanup function.
func setupTasksServer(t *testing.T) (*Server, func()) {
	t.Helper()
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	cfg := dbpkg.Config{DSN: "", User: "postgres", Password: "postgres", Name: "testdb"}
	db, err := dbpkg.Connect(cfg)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	srv := NewServer(stats.New(), 0, db, nil)
	return srv, func() { db.Close() }
}

// tableExists checks that the given table is present in the database.
func tableExists(t *testing.T, db *sql.DB, name string) bool {
	var exists bool
	err := db.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name=$1)`, name).Scan(&exists)
	if err != nil {
		t.Fatalf("check table %s: %v", name, err)
	}
	return exists
}

func TestTasksHandlers(t *testing.T) {
	srv, cleanup := setupTasksServer(t)
	defer cleanup()

	if !tableExists(t, srv.db.DB, "tasks") || !tableExists(t, srv.db.DB, "credentials") {
		t.Fatalf("expected tasks and credentials tables to exist")
	}

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	// ensure empty list
	resp, err := http.Get(ts.URL + "/api/tasks")
	if err != nil {
		t.Fatalf("get tasks: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var listResp struct {
		Success bool          `json:"success"`
		Data    []interface{} `json:"data"`
	}
	json.NewDecoder(resp.Body).Decode(&listResp)
	if !listResp.Success || len(listResp.Data) != 0 {
		t.Fatalf("expected empty list")
	}

	// create task
	body := bytes.NewBufferString(`{"vpn_type":"openvpn","server":"srv"}`)
	resp, err = http.Post(ts.URL+"/api/tasks", "application/json", body)
	if err != nil {
		t.Fatalf("post task: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("post status %d", resp.StatusCode)
	}
	var postResp struct {
		Success bool           `json:"success"`
		Data    map[string]int `json:"data"`
	}
	json.NewDecoder(resp.Body).Decode(&postResp)
	if !postResp.Success || postResp.Data["id"] == 0 {
		t.Fatalf("bad post response: %+v", postResp)
	}
	id := postResp.Data["id"]

	// update
	upd := map[string]interface{}{"vpn_type": "pptp", "server": "srv2"}
	ub, _ := json.Marshal(upd)
	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/tasks/"+strconv.Itoa(id), bytes.NewReader(ub))
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
	req, _ = http.NewRequest(http.MethodDelete, ts.URL+"/api/tasks/"+strconv.Itoa(id), nil)
	resp2, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("delete status %d", resp2.StatusCode)
	}
}
