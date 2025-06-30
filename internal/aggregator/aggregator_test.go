package aggregator

import (
	"bytes"
	"log"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGetServerInfoUnreadableFile(t *testing.T) {
	dir := t.TempDir()

	good := filepath.Join(dir, "stats_good.json")
	if err := os.WriteFile(good, []byte(`{"goods":5,"bads":1,"errors":0,"offline":0,"ipblock":0,"processed":5}`), 0644); err != nil {
		t.Fatalf("write good file: %v", err)
	}

	bad := filepath.Join(dir, "stats_bad.json")
	if err := os.WriteFile(bad, []byte(`bad`), 0644); err != nil {
		t.Fatalf("write bad file: %v", err)
	}
	if err := os.Chmod(bad, 0); err != nil {
		t.Fatalf("chmod bad file: %v", err)
	}
	defer os.Chmod(bad, 0644)

	buf := new(bytes.Buffer)
	log.SetOutput(buf)
	defer log.SetOutput(os.Stderr)

	aggr := New(dir)
	info, err := aggr.GetServerInfo()
	if err != nil {
		t.Fatalf("GetServerInfo error: %v", err)
	}
	if len(info) != 1 {
		t.Fatalf("expected 1 server info, got %d", len(info))
	}
	if info[0].Goods != 5 {
		t.Errorf("expected goods=5, got %d", info[0].Goods)
	}

	out := buf.String()
	if !strings.Contains(out, "stats read error") && !strings.Contains(out, "stats parse error") {
		t.Errorf("expected log about unreadable file, got %q", out)
	}
}
