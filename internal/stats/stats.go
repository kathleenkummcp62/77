package stats

import (
	"encoding/json"
	"fmt"
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
}

func New() *Stats {
	return &Stats{
		startTime: time.Now(),
		stopChan:  make(chan struct{}),
	}
}

func (s *Stats) Start() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.display()
			s.saveToFile()
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

func (s *Stats) display() {
	elapsed := time.Since(s.startTime)
	processed := atomic.LoadInt64(&s.Processed)
	goods := atomic.LoadInt64(&s.Goods)
	bads := atomic.LoadInt64(&s.Bads)
	errors := atomic.LoadInt64(&s.Errors)
	offline := atomic.LoadInt64(&s.Offline)
	ipblock := atomic.LoadInt64(&s.IPBlock)

	speed := float64(processed) / elapsed.Seconds()
	
	fmt.Printf("\r🔥 G:%d B:%d E:%d Off:%d Blk:%d | ⚡%.1f/s | ⏱️%v",
		goods, bads, errors, offline, ipblock, speed, elapsed.Truncate(time.Second))
}

func (s *Stats) saveToFile() {
	data := map[string]interface{}{
		"goods":     atomic.LoadInt64(&s.Goods),
		"bads":      atomic.LoadInt64(&s.Bads),
		"errors":    atomic.LoadInt64(&s.Errors),
		"offline":   atomic.LoadInt64(&s.Offline),
		"ipblock":   atomic.LoadInt64(&s.IPBlock),
		"processed": atomic.LoadInt64(&s.Processed),
		"timestamp": time.Now().Unix(),
	}

	jsonData, _ := json.Marshal(data)
	os.WriteFile(fmt.Sprintf("stats_%d.json", os.Getpid()), jsonData, 0644)
}

func (s *Stats) GetProcessed() int64 {
	return atomic.LoadInt64(&s.Processed)
}