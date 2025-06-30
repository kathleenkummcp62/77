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

	"fmt"

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
	srv := NewServer(stats.New(), 0, db)
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

	required := []string{"vendor_urls", "credentials", "proxies", "tasks", "logs"}
	for _, name := range required {
		if !tableExists(t, srv.db.DB, name) {
			t.Fatalf("expected table %s to exist", name)
		}
	}

	// create vendor url for tasks
	var vendorID int
	if err := srv.db.QueryRow(`INSERT INTO vendor_urls(url) VALUES($1) RETURNING id`, "https://vendor.example").Scan(&vendorID); err != nil {
		t.Fatalf("insert vendor url: %v", err)
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
	body := bytes.NewBufferString(fmt.Sprintf(`{"vpn_type":"openvpn","vendor_url_id":%d,"server":"srv","status":""}`, vendorID))
	resp, err = http.Post(ts.URL+"/api/tasks", "application/json", body)
	if err != nil {
		t.Fatalf("post task: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("post status %d", resp.StatusCode)
	}
	var postResp struct {
		Success bool                   `json:"success"`
		Data    map[string]interface{} `json:"data"`
	}
	json.NewDecoder(resp.Body).Decode(&postResp)
	if !postResp.Success || postResp.Data["id"] == 0 {
		t.Fatalf("bad post response: %+v", postResp)
	}
	id := int(postResp.Data["id"].(float64))

	// update
	upd := map[string]interface{}{"vpn_type": "wireguard", "vendor_url_id": vendorID, "server": "srv2", "status": "running"}
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

	// verify update reflected in list
	resp, err = http.Get(ts.URL + "/api/tasks")
	if err != nil {
		t.Fatalf("get after update: %v", err)
	}
	defer resp.Body.Close()
	listResp = struct {
		Success bool          `json:"success"`
		Data    []interface{} `json:"data"`
	}{}
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		t.Fatalf("decode list after update: %v", err)
	}
	if len(listResp.Data) != 1 {
		t.Fatalf("expected one task after update")
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

	resp, err = http.Get(ts.URL + "/api/tasks")
	if err != nil {
		t.Fatalf("get after delete: %v", err)
	}
	defer resp.Body.Close()
	listResp = struct {
		Success bool          `json:"success"`
		Data    []interface{} `json:"data"`
	}{}
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		t.Fatalf("decode list after delete: %v", err)
	}
	if len(listResp.Data) != 0 {
		t.Fatalf("expected no tasks after delete")
	}
}

func TestTasksBulkDeleteHandler(t *testing.T) {
	srv, cleanup := setupTasksServer(t)
	defer cleanup()
	// vendor URL needed for tasks
	var vendorID int
	if err := srv.db.QueryRow(`INSERT INTO vendor_urls(url) VALUES($1) RETURNING id`, "https://vendor.example").Scan(&vendorID); err != nil {
		t.Fatalf("insert vendor url: %v", err)
	}

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	create := func() int {
		body := bytes.NewBufferString(fmt.Sprintf(`{"vpn_type":"openvpn","vendor_url_id":%d,"server":"srv","status":""}`, vendorID))
		resp, err := http.Post(ts.URL+"/api/tasks", "application/json", body)
		if err != nil {
			t.Fatalf("post: %v", err)
		}
		defer resp.Body.Close()
		var pr struct {
			Success bool
			Data    map[string]int `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&pr); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if !pr.Success {
			t.Fatalf("create failed")
		}
		return pr.Data["id"]
	}

	id1 := create()
	id2 := create()

	reqBody := bytes.NewBufferString(fmt.Sprintf(`{"ids":[%d,%d]}`, id1, id2))
	resp, err := http.Post(ts.URL+"/api/tasks/bulk_delete", "application/json", reqBody)
	if err != nil {
		t.Fatalf("bulk delete: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}

	resp, err = http.Get(ts.URL + "/api/tasks")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	var list struct {
		Success bool                     `json:"success"`
		Data    []map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list.Data) != 0 {
		t.Fatalf("expected no tasks after bulk delete")
	}
}
