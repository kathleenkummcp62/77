package db

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

// Cache configuration
const (
	defaultCacheTTL = 60 // seconds
	maxCacheSize    = 1000
)

// CacheItem represents a cached item
type CacheItem struct {
	Data      []byte
	ExpiresAt time.Time
}

// Cache is a simple in-memory cache
type Cache struct {
	items      map[string]CacheItem
	mu         sync.RWMutex
	hits       int
	misses     int
	evictions  int
	cleanupRun time.Time
}

// NewCache creates a new cache
func NewCache() *Cache {
	cache := &Cache{
		items:      make(map[string]CacheItem),
		cleanupRun: time.Now(),
	}
	
	// Start cleanup goroutine
	go cache.startCleanup()
	
	return cache
}

// Global cache instance
var globalCache = NewCache()

// Get retrieves an item from the cache
func (c *Cache) Get(key string, result interface{}) bool {
	c.mu.RLock()
	item, found := c.items[key]
	c.mu.RUnlock()
	
	if !found || time.Now().After(item.ExpiresAt) {
		c.mu.Lock()
		c.misses++
		c.mu.Unlock()
		return false
	}
	
	err := json.Unmarshal(item.Data, result)
	if err != nil {
		log.Printf("cache unmarshal error: %v", err)
		c.mu.Lock()
		c.misses++
		c.mu.Unlock()
		return false
	}
	
	c.mu.Lock()
	c.hits++
	c.mu.Unlock()
	
	return true
}

// Set adds an item to the cache
func (c *Cache) Set(key string, data interface{}, ttl int) error {
	// Check if cache is full
	c.mu.RLock()
	if len(c.items) >= maxCacheSize {
		c.mu.RUnlock()
		c.cleanup()
	} else {
		c.mu.RUnlock()
	}
	
	// Marshal data
	bytes, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("cache marshal error: %w", err)
	}
	
	// Set TTL
	if ttl <= 0 {
		ttl = defaultCacheTTL
	}
	
	// Add to cache
	c.mu.Lock()
	c.items[key] = CacheItem{
		Data:      bytes,
		ExpiresAt: time.Now().Add(time.Duration(ttl) * time.Second),
	}
	c.mu.Unlock()
	
	return nil
}

// Delete removes an item from the cache
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}

// Clear removes all items from the cache
func (c *Cache) Clear() {
	c.mu.Lock()
	c.items = make(map[string]CacheItem)
	c.mu.Unlock()
}

// GetStats returns cache statistics
func (c *Cache) GetStats() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	return map[string]interface{}{
		"items":      len(c.items),
		"hits":       c.hits,
		"misses":     c.misses,
		"evictions":  c.evictions,
		"hit_ratio":  calculateHitRatio(c.hits, c.misses),
		"last_clean": c.cleanupRun.Format(time.RFC3339),
	}
}

// cleanup removes expired items from the cache
func (c *Cache) cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	now := time.Now()
	c.cleanupRun = now
	
	// Remove expired items
	for key, item := range c.items {
		if now.After(item.ExpiresAt) {
			delete(c.items, key)
			c.evictions++
		}
	}
	
	// If still too many items, remove oldest
	if len(c.items) >= maxCacheSize {
		// Find oldest items
		type keyExpiry struct {
			key      string
			expiresAt time.Time
		}
		
		oldest := make([]keyExpiry, 0, len(c.items))
		for key, item := range c.items {
			oldest = append(oldest, keyExpiry{key, item.ExpiresAt})
		}
		
		// Sort by expiration time
		for i := 0; i < len(oldest)-1; i++ {
			for j := i + 1; j < len(oldest); j++ {
				if oldest[i].expiresAt.After(oldest[j].expiresAt) {
					oldest[i], oldest[j] = oldest[j], oldest[i]
				}
			}
		}
		
		// Remove oldest items to get below maxCacheSize
		toRemove := len(c.items) - maxCacheSize + 100 // Remove extra to avoid frequent cleanups
		if toRemove > 0 {
			for i := 0; i < toRemove && i < len(oldest); i++ {
				delete(c.items, oldest[i].key)
				c.evictions++
			}
		}
	}
}

// startCleanup starts a goroutine to periodically clean up the cache
func (c *Cache) startCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		c.cleanup()
	}
}

// calculateHitRatio calculates the cache hit ratio
func calculateHitRatio(hits, misses int) float64 {
	total := hits + misses
	if total == 0 {
		return 0
	}
	return float64(hits) / float64(total) * 100
}

// GetCache returns the global cache instance
func GetCache() *Cache {
	return globalCache
}

// CacheQuery caches a database query result
func (d *DB) CacheQuery(query string, args []interface{}, result interface{}, ttl int) (bool, error) {
	if d == nil || d.DB == nil {
		return false, fmt.Errorf("database not initialized")
	}
	
	// Generate cache key
	key := fmt.Sprintf("query:%s:%v", query, args)
	
	// Check cache
	if globalCache.Get(key, result) {
		return true, nil
	}
	
	return false, nil
}

// SetCacheQuery sets a query result in the cache
func (d *DB) SetCacheQuery(query string, args []interface{}, result interface{}, ttl int) error {
	if d == nil || d.DB == nil {
		return fmt.Errorf("database not initialized")
	}
	
	// Generate cache key
	key := fmt.Sprintf("query:%s:%v", query, args)
	
	// Set in cache
	return globalCache.Set(key, result, ttl)
}

// ClearCache clears the entire cache
func (d *DB) ClearCache() {
	globalCache.Clear()
}

// ClearCacheKey clears a specific cache key
func (d *DB) ClearCacheKey(key string) {
	globalCache.Delete(key)
}

// GetCacheStats returns cache statistics
func (d *DB) GetCacheStats() map[string]interface{} {
	return globalCache.GetStats()
}