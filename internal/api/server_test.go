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

	"github.com/fergusstrange/embedded-postgres"
	_ "github.com/jackc/pgx/v5/stdlib"

	dbpkg "vpn-bruteforce-client/internal/db"
	"vpn-bruteforce-client/internal/stats"
)

func setupTestServer(t *testing.T) (*Server, func()) {
	if os.Geteuid() == 0 {
		t.Skip("cannot run embedded postgres as root")
	}
	pg := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().
		Port(5440).Database("testdb").Username("postgres").Password("postgres"))
	if err := pg.Start(); err != nil {
		t.Fatalf("failed to start embedded postgres: %v", err)
	}

	dsn := "postgres://postgres:postgres@localhost:5440/testdb?sslmode=disable"
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

	srv := NewServer(stats.New(), 0, db)
	return srv, func() {
		sqlDB.Close()
		pg.Stop()
	}
}

func TestTaskCRUD(t *testing.T) {
	srv, cleanup := setupTestServer(t)
	defer cleanup()

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	// initially empty
	resp, err := http.Get(ts.URL + "/api/tasks")
	if err != nil {
		t.Fatalf("get tasks: %v", err)
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
		t.Fatalf("expected empty tasks")
	}

	// create task
	body := bytes.NewBufferString(`{"vendor":"fortinet","url":"https://example.com","login":"user","password":"pass","proxy":""}`)
	resp, err = http.Post(ts.URL+"/api/tasks", "application/json", body)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	var postResp struct {
		Success bool
		Data    map[string]interface{}
	}
	json.NewDecoder(resp.Body).Decode(&postResp)
	if !postResp.Success {
		t.Fatalf("post failed")
	}
	id := int(postResp.Data["id"].(float64))

	// update
	upd := map[string]interface{}{"vendor": "cisco", "url": "https://example.org", "login": "u2", "password": "p2", "proxy": ""}
	ub, _ := json.Marshal(upd)
	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/tasks/"+strconv.Itoa(id), bytes.NewReader(ub))
	req.Header.Set("Content-Type", "application/json")
	resp2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp2.StatusCode)
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

func TestCredentialsEndpoint(t *testing.T) {
	srv, cleanup := setupTestServer(t)
	defer cleanup()

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

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
		t.Fatalf("expected empty credentials")
	}

	body := bytes.NewBufferString(`{"ip":"1.2.3.4","username":"u","password":"p"}`)
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

	resp, err = http.Get(ts.URL + "/api/credentials")
	if err != nil {
		t.Fatalf("get after add: %v", err)
	}
	defer resp.Body.Close()
	out = struct {
		Success bool                     `json:"success"`
		Data    []map[string]interface{} `json:"data"`
	}{}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode2: %v", err)
	}
	if !out.Success || len(out.Data) != 1 {
		t.Fatalf("expected one credential")
	}
	if int(out.Data[0]["id"].(float64)) != id {
		t.Fatalf("unexpected id")
	}
}

func TestTasksEndpoint(t *testing.T) {
	srv, cleanup := setupTestServer(t)
	defer cleanup()

	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	body := bytes.NewBufferString(`{"vendor":"fortinet","url":"https://example.com","login":"user","password":"pass","proxy":""}`)
	resp, err := http.Post(ts.URL+"/api/tasks", "application/json", body)
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

	resp, err = http.Get(ts.URL + "/api/tasks")
	if err != nil {
		t.Fatalf("get tasks: %v", err)
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
		t.Fatalf("expected tasks")
	}
	found := false
	for _, it := range out.Data {
		if int(it["id"].(float64)) == id {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("created task not found")
	}
}
