package stats

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync/atomic"
	"time"
)

type Stats struct {
	Goods     int64 `json:"goods"`
	Bads      int64 `json:"bads"`
	Errors    int64 `json:"errors"`
	Offline   int64 `json:"offline"`
	IPBlock   int64 `json:"ipblock"`
	Processed int64 `json:"processed"`

	startTime time.Time
	stopChan  chan struct{}

	// Performance metrics
	RPS     int64 `json:"rps"`
	AvgRPS  int64 `json:"avg_rps"`
	PeakRPS int64 `json:"peak_rps"`

	// Advanced metrics
	Threads  int64 `json:"threads"`
	Memory   int64 `json:"memory_mb"`
	CPUUsage int64 `json:"cpu_usage"`
}

func New() *Stats {
	return &Stats{
		startTime: time.Now(),
		stopChan:  make(chan struct{}),
	}
}

func (s *Stats) Start() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	var lastProcessed int64
	var rpsHistory []int64
	maxHistory := 60 // Keep 60 seconds of history

	for {
		select {
		case <-ticker.C:
			// Calculate current RPS
			currentProcessed := atomic.LoadInt64(&s.Processed)
			currentRPS := currentProcessed - lastProcessed
			lastProcessed = currentProcessed

			atomic.StoreInt64(&s.RPS, currentRPS)

			// Update RPS history
			rpsHistory = append(rpsHistory, currentRPS)
			if len(rpsHistory) > maxHistory {
				rpsHistory = rpsHistory[1:]
			}

			// Calculate average RPS
			var totalRPS int64
			for _, rps := range rpsHistory {
				totalRPS += rps
				if rps > atomic.LoadInt64(&s.PeakRPS) {
					atomic.StoreInt64(&s.PeakRPS, rps)
				}
			}
			if len(rpsHistory) > 0 {
				atomic.StoreInt64(&s.AvgRPS, totalRPS/int64(len(rpsHistory)))
			}

			s.display()
			if err := s.saveToFile(); err != nil {
				// errors are already logged in saveToFile
			}
		case <-s.stopChan:
			return
		}
	}
}

func (s *Stats) Stop() {
	close(s.stopChan)
}

func (s *Stats) IncrementGoods() {
	atomic.AddInt64(&s.Goods, 1)
	atomic.AddInt64(&s.Processed, 1)
}

func (s *Stats) IncrementBads() {
	atomic.AddInt64(&s.Bads, 1)
	atomic.AddInt64(&s.Processed, 1)
}

func (s *Stats) IncrementErrors() {
	atomic.AddInt64(&s.Errors, 1)
	atomic.AddInt64(&s.Processed, 1)
}

func (s *Stats) IncrementOffline() {
	atomic.AddInt64(&s.Offline, 1)
	atomic.AddInt64(&s.Processed, 1)
}

func (s *Stats) IncrementIPBlock() {
	atomic.AddInt64(&s.IPBlock, 1)
	atomic.AddInt64(&s.Processed, 1)
}

func (s *Stats) SetThreads(threads int64) {
	atomic.StoreInt64(&s.Threads, threads)
}

func (s *Stats) display() {
	elapsed := time.Since(s.startTime)
	processed := atomic.LoadInt64(&s.Processed)
	goods := atomic.LoadInt64(&s.Goods)
	bads := atomic.LoadInt64(&s.Bads)
	errors := atomic.LoadInt64(&s.Errors)
	offline := atomic.LoadInt64(&s.Offline)
	ipblock := atomic.LoadInt64(&s.IPBlock)
	currentRPS := atomic.LoadInt64(&s.RPS)
	avgRPS := atomic.LoadInt64(&s.AvgRPS)
	peakRPS := atomic.LoadInt64(&s.PeakRPS)
	threads := atomic.LoadInt64(&s.Threads)

	// Calculate success rate
	var successRate float64
	if processed > 0 {
		successRate = float64(goods) / float64(processed) * 100
	}

	fmt.Printf("\r🔥 G:%d B:%d E:%d Off:%d Blk:%d | ⚡%d/s (avg:%d peak:%d) | 📊%.1f%% | 🧵%d | ⏱️%v",
		goods, bads, errors, offline, ipblock,
		currentRPS, avgRPS, peakRPS, successRate, threads,
		elapsed.Truncate(time.Second))
}

func (s *Stats) saveToFile() error {
	data := map[string]interface{}{
		"goods":     atomic.LoadInt64(&s.Goods),
		"bads":      atomic.LoadInt64(&s.Bads),
		"errors":    atomic.LoadInt64(&s.Errors),
		"offline":   atomic.LoadInt64(&s.Offline),
		"ipblock":   atomic.LoadInt64(&s.IPBlock),
		"processed": atomic.LoadInt64(&s.Processed),
		"rps":       atomic.LoadInt64(&s.RPS),
		"avg_rps":   atomic.LoadInt64(&s.AvgRPS),
		"peak_rps":  atomic.LoadInt64(&s.PeakRPS),
		"threads":   atomic.LoadInt64(&s.Threads),
		"uptime":    time.Since(s.startTime).Seconds(),
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("failed to marshal stats: %v", err)
		return err
	}

	if err := os.WriteFile(fmt.Sprintf("stats_%d.json", os.Getpid()), jsonData, 0644); err != nil {
		log.Printf("failed to write stats file: %v", err)
		return err
	}

	return nil
}

// Getter methods for WebSocket API
func (s *Stats) GetProcessed() int64 {
	return atomic.LoadInt64(&s.Processed)
}

func (s *Stats) GetGoods() int64 {
	return atomic.LoadInt64(&s.Goods)
}

func (s *Stats) GetBads() int64 {
	return atomic.LoadInt64(&s.Bads)
}

func (s *Stats) GetErrors() int64 {
	return atomic.LoadInt64(&s.Errors)
}

func (s *Stats) GetOffline() int64 {
	return atomic.LoadInt64(&s.Offline)
}

func (s *Stats) GetIPBlock() int64 {
	return atomic.LoadInt64(&s.IPBlock)
}

func (s *Stats) GetRPS() int64 {
	return atomic.LoadInt64(&s.RPS)
}

func (s *Stats) GetAvgRPS() int64 {
	return atomic.LoadInt64(&s.AvgRPS)
}

func (s *Stats) GetPeakRPS() int64 {
	return atomic.LoadInt64(&s.PeakRPS)
}

func (s *Stats) GetThreads() int64 {
	return atomic.LoadInt64(&s.Threads)
}

func (s *Stats) GetUptime() int64 {
	return int64(time.Since(s.startTime).Seconds())
}

func (s *Stats) GetSuccessRate() float64 {
	processed := atomic.LoadInt64(&s.Processed)
	if processed == 0 {
		return 0
	}
	goods := atomic.LoadInt64(&s.Goods)
	return float64(goods) / float64(processed) * 100
}
