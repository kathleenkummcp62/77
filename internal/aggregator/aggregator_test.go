package aggregator

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeStatsFile(t *testing.T, dir, name string, s StatsFile) {
	t.Helper()
	data, err := json.Marshal(s)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, name), data, 0644); err != nil {
		t.Fatalf("write file: %v", err)
	}
}

func TestGetServerInfoUnreadableFiles(t *testing.T) {
	dir := t.TempDir()

	writeStatsFile(t, dir, "stats_a.json", StatsFile{Goods: 1, Bads: 2, Errors: 3, Processed: 6})
	writeStatsFile(t, dir, "stats_b.json", StatsFile{Goods: 2, Bads: 3, Errors: 0, Processed: 5})

	badTarget := filepath.Join(dir, "missing.json")
	os.Symlink(badTarget, filepath.Join(dir, "stats_bad.json"))

	var buf bytes.Buffer
	oldOut := log.Writer()
	log.SetOutput(&buf)
	defer log.SetOutput(oldOut)

	aggr := New(dir)
	infos, err := aggr.GetServerInfo()
	if err != nil {
		t.Fatalf("GetServerInfo: %v", err)
	}

	if len(infos) != 1 {
		t.Fatalf("expected 1 info, got %d", len(infos))
	}
	info := infos[0]

	if info.Goods != 3 || info.Bads != 5 || info.Errors != 3 || info.Processed != 11 {
		t.Fatalf("unexpected aggregated values: %+v", info)
	}

	logStr := buf.String()
	if !strings.Contains(logStr, "stats read error") || !strings.Contains(logStr, "stats_bad.json") {
		t.Fatalf("expected read error log for bad file, got %q", logStr)
	}
}

func TestGetServerInfoWalkErrorNilEntry(t *testing.T) {
	dir := t.TempDir()
	writeStatsFile(t, dir, "stats_ok.json", StatsFile{Goods: 5, Processed: 5})

	var buf bytes.Buffer
	oldOut := log.Writer()
	log.SetOutput(&buf)
	defer log.SetOutput(oldOut)

	oldWalk := walkDir
	walkDir = func(root string, fn fs.WalkDirFunc) error {
		if err := oldWalk(root, fn); err != nil {
			return err
		}
		return fn(filepath.Join(root, "stats_fail.json"), nil, fmt.Errorf("fail"))
	}
	defer func() { walkDir = oldWalk }()

	aggr := New(dir)
	infos, err := aggr.GetServerInfo()
	if err != nil {
		t.Fatalf("GetServerInfo: %v", err)
	}
	if len(infos) != 1 {
		t.Fatalf("expected 1 info, got %d", len(infos))
	}
	info := infos[0]
	if info.Goods != 5 || info.Processed != 5 {
		t.Fatalf("unexpected aggregated values: %+v", info)
	}

	logStr := buf.String()
	if !strings.Contains(logStr, "stats walk error") || !strings.Contains(logStr, "stats_fail.json") {
		t.Fatalf("expected walk error log, got %q", logStr)
	}
}
