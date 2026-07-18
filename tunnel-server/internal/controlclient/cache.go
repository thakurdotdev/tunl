package controlclient

import (
	"sync"
	"time"
)

type cacheItem struct {
	value     interface{}
	expiresAt time.Time
}

// ttlCache is a minimal TTL map — implementation detail of Client,
// deliberately not exported as its own package (plan step 8).
type ttlCache struct {
	mu  sync.Mutex
	ttl time.Duration
	m   map[string]cacheItem
}

func newTTLCache(ttl time.Duration) *ttlCache {
	return &ttlCache{ttl: ttl, m: make(map[string]cacheItem)}
}

func (c *ttlCache) get(key string) (interface{}, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	item, ok := c.m[key]
	if !ok || time.Now().After(item.expiresAt) {
		return nil, false
	}
	return item.value, true
}

func (c *ttlCache) set(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key] = cacheItem{value: value, expiresAt: time.Now().Add(c.ttl)}
}
