package aggregator

import (
    "bytes"
    "encoding/json"
    "log"
    "os"
    "path/filepath"
    "testing"
)

func writeStats(path string, s StatsFile) error {
    data, err := json.Marshal(s)
    if err != nil {
        return err
    }
    return os.WriteFile(path, data, 0644)
}

func TestGetServerInfoUnreadableFile(t *testing.T) {
    dir := t.TempDir()

    if err := writeStats(filepath.Join(dir, "stats_good.json"), StatsFile{Goods: 1}); err != nil {
        t.Fatalf("write good stats: %v", err)
    }

    badPath := filepath.Join(dir, "stats_bad.json")
    if err := os.WriteFile(badPath, []byte("{"), 0644); err != nil {
        t.Fatalf("write bad stats: %v", err)
    }

    var buf bytes.Buffer
    log.SetOutput(&buf)
    defer log.SetOutput(os.Stderr)

    agg := New(dir)
    infos, err := agg.GetServerInfo()
    if err != nil {
        t.Fatalf("GetServerInfo error: %v", err)
    }
    if len(infos) == 0 {
        t.Fatalf("expected server info")
    }
    if infos[0].Goods != 1 {
        t.Errorf("expected goods 1, got %d", infos[0].Goods)
    }
    logs := buf.String()
    if !bytes.Contains([]byte(logs), []byte("stats parse error")) {
        t.Errorf("expected log about unreadable file")
    }
}

