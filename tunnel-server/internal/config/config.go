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
	AnonTunnelMaxDuration time.Duration
	ReservedSubdomains    map[string]struct{}

	RedisURL              string
	RequestLogEnabled     bool
	RequestLogMaxBodySize int
}

func Load() (*Config, error) {
	loadDotEnv()
	cfg := &Config{
		BaseDomain:           getEnv("BASE_DOMAIN", "thakur.dev"),
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
	}

	graceSeconds := getEnvInt("RECONNECT_GRACE_SECONDS", 12)
	cfg.ReconnectGraceWindow = time.Duration(graceSeconds) * time.Second

	anonMinutes := getEnvInt("ANON_TUNNEL_MAX_MINUTES", 240)
	cfg.AnonTunnelMaxDuration = time.Duration(anonMinutes) * time.Minute

	cfg.ReservedSubdomains = parseReservedSubdomains(getEnv("RESERVED_SUBDOMAINS", ""))

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
