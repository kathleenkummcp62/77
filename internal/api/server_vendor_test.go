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

func setupVendorServer(t *testing.T) (*Server, func()) {
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

func TestVendorURLHandlers(t *testing.T) {
    srv, cleanup := setupVendorServer(t)
    defer cleanup()
    ts := httptest.NewServer(srv.router)
    defer ts.Close()

    // initial list empty
    resp, err := http.Get(ts.URL + "/api/vendor_urls")
    if err != nil {
        t.Fatalf("get list: %v", err)
    }
    defer resp.Body.Close()
    var out APIResponse
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
        t.Fatalf("decode list: %v", err)
    }
    if !out.Success || len(out.Data.([]interface{})) != 0 {
        t.Fatalf("expected empty list")
    }

    // create
    body := bytes.NewBufferString(`{"url":"https://vendor.example"}`)
    resp, err = http.Post(ts.URL+"/api/vendor_urls", "application/json", body)
    if err != nil {
        t.Fatalf("post: %v", err)
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        t.Fatalf("status %d", resp.StatusCode)
    }
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
        t.Fatalf("decode create: %v", err)
    }
    data := out.Data.(map[string]interface{})
    id := int(data["id"].(float64))

    // update
    upd := bytes.NewBufferString(`{"url":"https://new.example"}`)
    req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/vendor_urls/"+strconv.Itoa(id), upd)
    req.Header.Set("Content-Type", "application/json")
    resp2, err := http.DefaultClient.Do(req)
    if err != nil {
        t.Fatalf("put: %v", err)
    }
    resp2.Body.Close()
    if resp2.StatusCode != http.StatusOK {
        t.Fatalf("put status %d", resp2.StatusCode)
    }

    // bulk delete
    delBody := bytes.NewBufferString(fmt.Sprintf(`{"ids":[%d]}`, id))
    resp, err = http.Post(ts.URL+"/api/vendor_urls/bulk_delete", "application/json", delBody)
    if err != nil {
        t.Fatalf("bulk delete: %v", err)
    }
    resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        t.Fatalf("bulk delete status %d", resp.StatusCode)
    }

    resp, err = http.Get(ts.URL + "/api/vendor_urls")
    if err != nil {
        t.Fatalf("get after delete: %v", err)
    }
    defer resp.Body.Close()
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
        t.Fatalf("decode list2: %v", err)
    }
    if len(out.Data.([]interface{})) != 0 {
        t.Fatalf("expected empty after delete")
    }
}

