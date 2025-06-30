package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	dbpkg "vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

// setupAPIServer returns a new Server backed by an embedded database.
func setupAPIServer(t *testing.T) (*Server, func()) {
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

func TestCredentialsCRUDHandlers(t *testing.T) {
	srv, cleanup := setupAPIServer(t)
	defer cleanup()

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	// ensure empty
	resp, err := http.Get(ts.URL + "/api/credentials")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var list struct {
		Success bool                     `json:"success"`
		Data    []map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(list.Data) != 0 {
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
		Success bool                   `json:"success"`
		Data    map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&postResp); err != nil {
		t.Fatalf("decode post: %v", err)
	}
	if !postResp.Success {
		t.Fatalf("create failed")
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
		t.Fatalf("update status %d", resp2.StatusCode)
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

func TestProxyCRUDHandlers(t *testing.T) {
	srv, cleanup := setupAPIServer(t)
	defer cleanup()
	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	body := bytes.NewBufferString(`{"address":"1.1.1.1:80","username":"u","password":"p"}`)
	resp, err := http.Post(ts.URL+"/api/proxies", "application/json", body)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	var postResp struct {
		Success bool                   `json:"success"`
		Data    map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&postResp); err != nil {
		t.Fatalf("decode post: %v", err)
	}
	id := int(postResp.Data["id"].(float64))

	upd := map[string]string{"address": "2.2.2.2:80", "username": "u2", "password": "p2"}
	ub, _ := json.Marshal(upd)
	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/proxies/"+strconv.Itoa(id), bytes.NewReader(ub))
	req.Header.Set("Content-Type", "application/json")
	resp2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("update status %d", resp2.StatusCode)
	}

	req, _ = http.NewRequest(http.MethodDelete, ts.URL+"/api/proxies/"+strconv.Itoa(id), nil)
	resp2, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("delete status %d", resp2.StatusCode)
	}
}

func TestTasksCRUDHandlers(t *testing.T) {
	srv, cleanup := setupAPIServer(t)
	defer cleanup()
	var vendorID int
	if err := srv.db.QueryRow(`INSERT INTO vendor_urls(url) VALUES($1) RETURNING id`, "https://vendor.example").Scan(&vendorID); err != nil {
		t.Fatalf("insert vendor url: %v", err)
	}

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	body := bytes.NewBufferString(fmt.Sprintf(`{"vpn_type":"openvpn","vendor_url_id":%d,"server":"srv","status":""}`, vendorID))
	resp, err := http.Post(ts.URL+"/api/tasks", "application/json", body)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	var postResp struct {
		Success bool                   `json:"success"`
		Data    map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&postResp); err != nil {
		t.Fatalf("decode post: %v", err)
	}
	id := int(postResp.Data["id"].(float64))

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
		t.Fatalf("update status %d", resp2.StatusCode)
	}

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
