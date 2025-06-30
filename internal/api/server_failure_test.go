package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
)

func TestCredentialsInvalidJSON(t *testing.T) {
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
		t.Fatalf("expected failure, got %+v", out)
	}
}

func TestCredentialsBulkDeleteInvalidJSON(t *testing.T) {
	srv, cleanup := setupCredsServer(t)
	defer cleanup()
	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	resp, err := http.Post(ts.URL+"/api/credentials/bulk_delete", "application/json", bytes.NewBufferString("{"))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()

	var out APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Success || out.Error == "" {
		t.Fatalf("expected failure")
	}
}

func createCred(t *testing.T, ts *httptest.Server) int {
	body := bytes.NewBufferString(`{"ip":"1.1.1.1","username":"u","password":"p"}`)
	resp, err := http.Post(ts.URL+"/api/credentials", "application/json", body)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	defer resp.Body.Close()
	var out APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	data := out.Data.(map[string]interface{})
	return int(data["id"].(float64))
}

func TestCredentialUpdateInvalidJSON(t *testing.T) {
	srv, cleanup := setupCredsServer(t)
	defer cleanup()
	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	id := createCred(t, ts)

	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/credentials/"+strconv.Itoa(id), bytes.NewBufferString("{"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	defer resp.Body.Close()
	var out APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Success || out.Error == "" {
		t.Fatalf("expected failure")
	}
}

func TestTasksInvalidJSON(t *testing.T) {
	srv, cleanup := setupTasksServer(t)
	defer cleanup()
	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	resp, err := http.Post(ts.URL+"/api/tasks", "application/json", bytes.NewBufferString("{"))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	var out APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Success || out.Error == "" {
		t.Fatalf("expected failure")
	}
}

func TestTasksBulkDeleteInvalidJSON(t *testing.T) {
	srv, cleanup := setupTasksServer(t)
	defer cleanup()
	ts := httptest.NewServer(srv.router)
	defer ts.Close()

	resp, err := http.Post(ts.URL+"/api/tasks/bulk_delete", "application/json", bytes.NewBufferString("{"))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	var out APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Success || out.Error == "" {
		t.Fatalf("expected failure")
	}
}

func createTaskItem(t *testing.T, ts *httptest.Server, vendorID int) int {
	body := bytes.NewBufferString(fmt.Sprintf(`{"vpn_type":"openvpn","vendor_url_id":%d,"server":"srv","status":""}`, vendorID))
	resp, err := http.Post(ts.URL+"/api/tasks", "application/json", body)
	if err != nil {
		t.Fatalf("create task: %v", err)
	}
	defer resp.Body.Close()
	var out APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	data := out.Data.(map[string]interface{})
	return int(data["id"].(float64))
}

func TestTaskUpdateInvalidJSON(t *testing.T) {
	srv, cleanup := setupTasksServer(t)
	defer cleanup()
	var vendorID int
	if err := srv.db.QueryRow(`INSERT INTO vendor_urls(url) VALUES($1) RETURNING id`, "https://vendor.example").Scan(&vendorID); err != nil {
		t.Fatalf("insert vendor url: %v", err)
	}

	ts := httptest.NewServer(srv.router)
	defer ts.Close()
	id := createTaskItem(t, ts, vendorID)

	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/tasks/"+strconv.Itoa(id), bytes.NewBufferString("{"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	defer resp.Body.Close()
	var out APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Success || out.Error == "" {
		t.Fatalf("expected failure")
	}
}
