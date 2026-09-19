package requestlog

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

type CapturedRequest struct {
	ID              string            `json:"id"`
	Timestamp       time.Time         `json:"timestamp"`
	Method          string            `json:"method"`
	Path            string            `json:"path"`
	StatusCode      int               `json:"statusCode"`
	DurationMs      int64             `json:"durationMs"`
	RequestSize     int64             `json:"requestSize"`
	ResponseSize    int64             `json:"responseSize"`
	RequestHeaders  map[string]string `json:"requestHeaders"`
	ResponseHeaders map[string]string `json:"responseHeaders"`
	RequestBody     string            `json:"requestBody,omitempty"`
	ResponseBody    string            `json:"responseBody,omitempty"`
	ClientIP        string            `json:"clientIP"`
}

const (
	maxRingSize = 100
	keyTTL      = 30 * time.Minute
)

func listKey(subdomain string) string { return fmt.Sprintf("tunl:requests:%s", subdomain) }
func liveChannel(subdomain string) string {
	return fmt.Sprintf("tunl:requests:live:%s", subdomain)
}

type Publisher struct {
	rdb         *redis.Client
	maxBodySize int
	log         *slog.Logger
	queue       chan publishJob
}

type publishJob struct {
	subdomain string
	data      []byte
}

func NewPublisher(rdb *redis.Client, maxBodySize int, log *slog.Logger) *Publisher {
	p := &Publisher{
		rdb:         rdb,
		maxBodySize: maxBodySize,
		log:         log,
		queue:       make(chan publishJob, 256),
	}
	go p.drain()
	return p
}

func (p *Publisher) MaxBodySize() int { return p.maxBodySize }

func (p *Publisher) FlushSubdomainLogs(subdomain string) {
	if p == nil || p.rdb == nil || subdomain == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := p.rdb.Del(ctx, listKey(subdomain)).Err(); err != nil {
		p.log.Warn("failed to flush subdomain request logs", "subdomain", subdomain, "error", err)
	}
}

// Publish enqueues a captured request for async write to Redis.
func (p *Publisher) Publish(subdomain string, req *CapturedRequest) {
	data, err := json.Marshal(req)
	if err != nil {
		p.log.Warn("failed to marshal captured request", "error", err)
		return
	}
	select {
	case p.queue <- publishJob{subdomain: subdomain, data: data}:
	default:
		p.log.Warn("request log queue full, dropping entry", "subdomain", subdomain)
	}
}

func (p *Publisher) pruneExpired(ctx context.Context, key string) {
	cutoff := time.Now().Add(-keyTTL)
	for range 10 {
		tail, err := p.rdb.LIndex(ctx, key, -1).Result()
		if err != nil || tail == "" {
			break
		}
		var entry struct {
			Timestamp time.Time `json:"timestamp"`
		}
		if err := json.Unmarshal([]byte(tail), &entry); err != nil {
			break
		}
		if entry.Timestamp.Before(cutoff) {
			_ = p.rdb.RPop(ctx, key).Err()
		} else {
			break
		}
	}
}

func (p *Publisher) drain() {
	ctx := context.Background()
	for job := range p.queue {
		key := listKey(job.subdomain)
		pipe := p.rdb.Pipeline()
		pipe.LPush(ctx, key, job.data)
		pipe.LTrim(ctx, key, 0, maxRingSize-1)
		pipe.Expire(ctx, key, keyTTL)
		if _, err := pipe.Exec(ctx); err != nil {
			p.log.Warn("redis pipeline failed", "error", err, "subdomain", job.subdomain)
		}
		p.pruneExpired(ctx, key)
		if err := p.rdb.Publish(ctx, liveChannel(job.subdomain), job.data).Err(); err != nil {
			p.log.Warn("redis publish failed", "error", err, "subdomain", job.subdomain)
		}
	}
}
