package aggregator

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

// StatsFile represents contents of stats_*.json written by workers.
type StatsFile struct {
	Goods     int64 `json:"goods"`
	Bads      int64 `json:"bads"`
	Errors    int64 `json:"errors"`
	Offline   int64 `json:"offline"`
	IPBlock   int64 `json:"ipblock"`
	Processed int64 `json:"processed"`
}

// ServerInfo is aggregated information returned to API and WebSocket layers.
type ServerInfo struct {
	IP        string `json:"ip"`
	Status    string `json:"status"`
	Uptime    string `json:"uptime"`
	CPU       int    `json:"cpu"`
	Memory    int    `json:"memory"`
	Disk      int    `json:"disk"`
	Speed     string `json:"speed"`
	Processed int    `json:"processed"`
	Goods     int    `json:"goods"`
	Bads      int    `json:"bads"`
	Errors    int    `json:"errors"`
	Progress  int    `json:"progress"`
	Task      string `json:"current_task"`
}

// Aggregator reads stats files from the provided directory.
type Aggregator struct {
	dir string
}

// New returns Aggregator that looks for stats_*.json in dir.
func New(dir string) *Aggregator {
	if dir == "" {
		dir = "."
	}
	return &Aggregator{dir: dir}
}

// GetServerInfo aggregates metrics from all stats_*.json files.
func (a *Aggregator) GetServerInfo() ([]ServerInfo, error) {
	var total StatsFile
	err := filepath.WalkDir(a.dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		name := d.Name()
		if strings.HasPrefix(name, "stats_") && strings.HasSuffix(name, ".json") {
			data, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			var s StatsFile
			if json.Unmarshal(data, &s) == nil {
				total.Goods += s.Goods
				total.Bads += s.Bads
				total.Errors += s.Errors
				total.Offline += s.Offline
				total.IPBlock += s.IPBlock
				total.Processed += s.Processed
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// System metrics using gopsutil
	cpuPercent, errCPU := cpu.Percent(0, false)
	if errCPU != nil {
		log.Printf("cpu.Percent error: %v", errCPU)
	}
	memStat, errMem := mem.VirtualMemory()
	if errMem != nil {
		log.Printf("mem.VirtualMemory error: %v", errMem)
	}
	diskStat, errDisk := disk.Usage("/")
	if errDisk != nil {
		log.Printf("disk.Usage error: %v", errDisk)
	}
	uptimeSec := getUptime()

	info := ServerInfo{
		IP:        "localhost",
		Status:    "online",
		Uptime:    formatDuration(time.Duration(uptimeSec) * time.Second),
		CPU:       sliceToInt(cpuPercent),
		Memory:    int(memStat.UsedPercent + 0.5),
		Disk:      int(diskStat.UsedPercent + 0.5),
		Speed:     "-",
		Processed: int(total.Processed),
		Goods:     int(total.Goods),
		Bads:      int(total.Bads),
		Errors:    int(total.Errors),
		Progress:  0,
		Task:      "",
	}

	return []ServerInfo{info}, nil
}

func getUptime() uint64 {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0
	}
	var up float64
	if _, err := fmt.Sscanf(string(data), "%f", &up); err != nil {
		return 0
	}
	return uint64(up)
}

func formatDuration(d time.Duration) string {
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	return fmt.Sprintf("%dh %dm", h, m)
}

func sliceToInt(f []float64) int {
	if len(f) == 0 {
		return 0
	}
	return int(f[0] + 0.5)
}
