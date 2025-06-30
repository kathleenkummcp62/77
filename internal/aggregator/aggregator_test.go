package aggregator

import (
	"bytes"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGetServerInfoUnreadableFile(t *testing.T) {
	dir := t.TempDir()

	// create valid stats file
	valid := filepath.Join(dir, "stats_good.json")
	stats := StatsFile{Goods: 1, Bads: 2, Errors: 3, Offline: 4, IPBlock: 5, Processed: 6}
	data, err := json.Marshal(stats)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if err := os.WriteFile(valid, data, 0o644); err != nil {
		t.Fatalf("write valid: %v", err)
	}

	// create malformed stats file to trigger parse error
	bad := filepath.Join(dir, "stats_bad.json")
	if err := os.WriteFile(bad, []byte("{"), 0o644); err != nil {
		t.Fatalf("write bad: %v", err)
	}

	var buf bytes.Buffer
	log.SetOutput(&buf)
	defer log.SetOutput(os.Stderr)

	a := New(dir)
	info, err := a.GetServerInfo()
	if err != nil {
		t.Fatalf("GetServerInfo: %v", err)
	}
	if len(info) != 1 {
		t.Fatalf("expected 1 server info, got %d", len(info))
	}
	got := info[0]
	if got.Processed != int(stats.Processed) || got.Goods != int(stats.Goods) || got.Bads != int(stats.Bads) || got.Errors != int(stats.Errors) {
		t.Errorf("aggregated values mismatch: %+v", got)
	}

	if !strings.Contains(buf.String(), "stats parse error") {
		t.Errorf("expected log to contain parse error, got %q", buf.String())
	}
}
