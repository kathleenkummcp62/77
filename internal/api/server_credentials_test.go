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

func tableExistsCred(t *testing.T, db *sql.DB, name string) bool {
	var exists bool
	err := db.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name=$1)`, name).Scan(&exists)
	if err != nil {
		t.Fatalf("check table %s: %v", name, err)
	}
	return exists
}

func TestServerInitTables(t *testing.T) {
	srv, cleanup := setupCredsServer(t)
	defer cleanup()

	required := []string{"vendor_urls", "credentials", "proxies", "tasks", "logs"}
	for _, tbl := range required {
		if !tableExistsCred(t, srv.db.DB, tbl) {
			t.Fatalf("expected table %s to exist", tbl)
		}
	}
}

func TestCredentialsCRUD(t *testing.T) {
	srv, cleanup := setupCredsServer(t)
	defer cleanup()

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	// initially empty
	resp, err := http.Get(ts.URL + "/api/credentials")
	if err != nil {
		t.Fatalf("get credentials: %v", err)
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
	if !list.Success || len(list.Data) != 0 {
		t.Fatalf("expected empty list")
	}

	// create
	body := bytes.NewBufferString(`{"ip":"1.1.1.1","username":"u","password":"p"}`)
	resp, err = http.Post(ts.URL+"/api/credentials", "application/json", body)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("post status %d", resp.StatusCode)
	}
	var postResp struct {
		Success bool                   `json:"success"`
		Data    map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&postResp); err != nil {
		t.Fatalf("decode post: %v", err)
	}
	if !postResp.Success || postResp.Data["id"] == nil {
		t.Fatalf("bad post response")
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

	// verify update
	resp, err = http.Get(ts.URL + "/api/credentials")
	if err != nil {
		t.Fatalf("get after update: %v", err)
	}
	defer resp.Body.Close()
	list = struct {
		Success bool                     `json:"success"`
		Data    []map[string]interface{} `json:"data"`
	}{}
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list.Data) != 1 || list.Data[0]["ip"].(string) != upd["ip"] {
		t.Fatalf("update not reflected")
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

	resp, err = http.Get(ts.URL + "/api/credentials")
	if err != nil {
		t.Fatalf("get after delete: %v", err)
	}
	defer resp.Body.Close()
	list = struct {
		Success bool                     `json:"success"`
		Data    []map[string]interface{} `json:"data"`
	}{}
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		t.Fatalf("decode after delete: %v", err)
	}
	if len(list.Data) != 0 {
		t.Fatalf("expected empty list after delete")
	}
}
