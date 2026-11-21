// Package config loads all tunneld configuration from the environment.
// Load this first in main.go — every other package assumes a populated
// Config already exists (see plan section 1.3, step 1).
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	BaseDomain            string
	TunnelURLScheme       string
	SSHListenAddr         string
	HTTPListenAddr        string
	HTTPSListenAddr       string
	TLSCertPath           string
	TLSKeyPath            string
	HealthListenAddr      string
	ControlPlaneURL       string
	InternalSharedSecret  string
	SubdomainRetries      int
	ReconnectGraceWindow  time.Duration
	MaxConnsPerIP         int
	MaxTotalTunnels       int
	AnonTunnelMaxDuration time.Duration
	ReservedSubdomains    map[string]struct{}
	RateLimitEnabled      bool

	// Abuse protection. Sizes are bytes, rates are per second.
	TrustedProxies        []string
	RateLimitIPRate       float64
	RateLimitIPBurst      int
	RateLimitTunnelRate   float64
	RateLimitTunnelBurst  int
	BansEnabled           bool
	MaxBodyAnon           int64
	MaxBodyUser           int64
	MaxInflightPerTunnel  int
	InflightWait          time.Duration
	MaxInflightTotal      int
	MaxWSPerTunnel        int
	MaxWSPerIP            int
	BandwidthAnon         int64
	BandwidthUser         int64
	ResponseHeaderTimeout time.Duration
	MaxSSHConnsPerUser    int
	SSHForwardTimeout     time.Duration

	RedisURL              string
	RequestLogEnabled     bool
	RequestLogMaxBodySize int
}

func Load() (*Config, error) {
	loadDotEnv()
	cfg := &Config{
		BaseDomain:           getEnv("BASE_DOMAIN", "tunl.online"),
		TunnelURLScheme:      getEnv("TUNNEL_URL_SCHEME", "https"),
		SSHListenAddr:        getEnv("SSH_LISTEN_ADDR", ":2222"),
		HTTPListenAddr:       getEnv("HTTP_LISTEN_ADDR", ":8080"),
		HTTPSListenAddr:      getEnv("HTTPS_LISTEN_ADDR", ":8443"),
		TLSCertPath:          getEnv("TLS_CERT_PATH", ""),
		TLSKeyPath:           getEnv("TLS_KEY_PATH", ""),
		HealthListenAddr:     getEnv("HEALTH_LISTEN_ADDR", ":9090"),
		ControlPlaneURL:      getEnv("CONTROL_PLANE_URL", "http://localhost:3001"),
		InternalSharedSecret: strings.TrimSpace(getEnv("INTERNAL_SHARED_SECRET", "changeme-shared-secret-at-least-16-chars")),
		SubdomainRetries:     getEnvInt("SUBDOMAIN_RETRIES", 5),
		MaxConnsPerIP:        getEnvInt("MAX_CONNS_PER_IP", 10),
		MaxTotalTunnels:      getEnvInt("MAX_TOTAL_TUNNELS", 10000),
		RateLimitEnabled:     getEnv("RATE_LIMIT_ENABLED", "true") == "true",
	}

	graceSeconds := getEnvInt("RECONNECT_GRACE_SECONDS", 12)
	cfg.ReconnectGraceWindow = time.Duration(graceSeconds) * time.Second

	anonMinutes := getEnvInt("ANON_TUNNEL_MAX_MINUTES", 240)
	cfg.AnonTunnelMaxDuration = time.Duration(anonMinutes) * time.Minute

	cfg.ReservedSubdomains = parseReservedSubdomains(getEnv("RESERVED_SUBDOMAINS", ""))

	const mb = 1024 * 1024
	cfg.TrustedProxies = strings.Split(getEnv("TRUSTED_PROXIES", "127.0.0.0/8,::1/128"), ",")
	cfg.RateLimitIPRate = float64(getEnvInt("RATE_LIMIT_IP_RPS", 100))
	cfg.RateLimitIPBurst = getEnvInt("RATE_LIMIT_IP_BURST", 400)
	cfg.RateLimitTunnelRate = float64(getEnvInt("RATE_LIMIT_TUNNEL_RPS", 300))
	cfg.RateLimitTunnelBurst = getEnvInt("RATE_LIMIT_TUNNEL_BURST", 800)
	cfg.BansEnabled = getEnv("BANS_ENABLED", "true") == "true"
	cfg.MaxBodyAnon = int64(getEnvInt("MAX_BODY_ANON_MB", 10)) * mb
	cfg.MaxBodyUser = int64(getEnvInt("MAX_BODY_USER_MB", 100)) * mb
	cfg.MaxInflightPerTunnel = getEnvInt("MAX_INFLIGHT_PER_TUNNEL", 200)
	cfg.InflightWait = time.Duration(getEnvInt("INFLIGHT_WAIT_SECONDS", 10)) * time.Second
	cfg.MaxInflightTotal = getEnvInt("MAX_INFLIGHT_TOTAL", 4000)
	cfg.MaxWSPerTunnel = getEnvInt("MAX_WS_PER_TUNNEL", 200)
	cfg.MaxWSPerIP = getEnvInt("MAX_WS_PER_IP", 30)
	cfg.BandwidthAnon = int64(getEnvInt("BANDWIDTH_ANON_MB_PER_SEC", 10)) * mb
	cfg.BandwidthUser = int64(getEnvInt("BANDWIDTH_USER_MB_PER_SEC", 30)) * mb
	cfg.ResponseHeaderTimeout = time.Duration(getEnvInt("RESPONSE_HEADER_TIMEOUT_SECONDS", 120)) * time.Second
	cfg.MaxSSHConnsPerUser = getEnvInt("MAX_SSH_CONNS_PER_USER", 20)
	cfg.SSHForwardTimeout = time.Duration(getEnvInt("SSH_FORWARD_TIMEOUT_SECONDS", 60)) * time.Second

	cfg.RedisURL = getEnv("REDIS_URL", "")
	cfg.RequestLogEnabled = getEnv("REQUEST_LOG_ENABLED", "true") == "true"
	cfg.RequestLogMaxBodySize = getEnvInt("REQUEST_LOG_MAX_BODY_SIZE", 16384)

	if cfg.InternalSharedSecret == "" {
		return nil, fmt.Errorf("INTERNAL_SHARED_SECRET is required")
	}

	return cfg, nil
}

func loadDotEnv() {
	data, err := os.ReadFile(".env")
	if err != nil {
		return
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			v = strings.Trim(v, `"'`)
			if os.Getenv(k) == "" {
				os.Setenv(k, v)
			}
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func parseReservedSubdomains(raw string) map[string]struct{} {
	m := make(map[string]struct{})
	if raw == "" {
		return m
	}
	for _, s := range strings.Split(raw, ",") {
		s = strings.TrimSpace(strings.ToLower(s))
		if s != "" {
			m[s] = struct{}{}
		}
	}
	return m
}
