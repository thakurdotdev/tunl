package main

import (
	"context"
	"crypto"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/pem"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/config"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/controlclient"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/health"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/httpproxy"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/logging"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/requestlog"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/sshserver"
	"golang.org/x/crypto/ssh"
)

// keyValidatorAdapter bridges controlclient.Client (context-aware) to the
// sshserver.KeyValidator interface (context-free, since SSH's PublicKeyCallback
// doesn't carry a context). The HTTP client's own timeout prevents hangs.
type keyValidatorAdapter struct {
	client *controlclient.Client
}

func (a *keyValidatorAdapter) ValidateKey(fingerprint string) (string, string, string, []string, string, int, bool) {
	return a.client.ValidateKey(context.Background(), fingerprint)
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	logger := logging.Init(getEnv("LOG_LEVEL", "info"))

	reg := registry.New(cfg.ReconnectGraceWindow, cfg.ReservedSubdomains)

	ccClient := controlclient.New(controlclient.Options{
		BaseURL:      cfg.ControlPlaneURL,
		SharedSecret: cfg.InternalSharedSecret,
		Logger:       logger,
	})

	hostKey, err := loadOrGenerateHostKey()
	if err != nil {
		logger.Error("failed to generate ssh host key", "error", err)
		os.Exit(1)
	}

	sshSrv := sshserver.New(sshserver.Options{
		ListenAddr:       cfg.SSHListenAddr,
		BaseDomain:       cfg.BaseDomain,
		URLScheme:        cfg.TunnelURLScheme,
		Registry:         reg,
		KeyValidator:     &keyValidatorAdapter{client: ccClient},
		SessionReporter:  ccClient,
		SubdomainRetries: cfg.SubdomainRetries,
		MaxConnsPerIP:    cfg.MaxConnsPerIP,
		AnonMaxDuration:  cfg.AnonTunnelMaxDuration,
		HostKey:          hostKey,
		Logger:           logger,
	})

	proxyHandler := httpproxy.NewHandler(httpproxy.Options{
		Registry:    reg,
		BaseDomain:  cfg.BaseDomain,
		DialTimeout: 10 * time.Second,
		Logger:      logger,
	})

	// Wrap the proxy with request capture when Redis is available
	var finalHandler http.Handler = proxyHandler
	if cfg.RedisURL != "" && cfg.RequestLogEnabled {
		opts, err := redis.ParseURL(cfg.RedisURL)
		if err != nil {
			logger.Error("invalid REDIS_URL", "error", err)
			os.Exit(1)
		}
		rdb := redis.NewClient(opts)
		if err := rdb.Ping(context.Background()).Err(); err != nil {
			logger.Warn("redis not reachable, request logging disabled", "error", err)
		} else {
			publisher := requestlog.NewPublisher(rdb, cfg.RequestLogMaxBodySize, logger)
			subdomainExtractor := httpproxy.SubdomainExtractor(cfg.BaseDomain)
			finalHandler = httpproxy.CaptureMiddleware(proxyHandler, publisher, subdomainExtractor)
			logger.Info("request inspector enabled", "maxBodySize", cfg.RequestLogMaxBodySize)
		}
	}

	healthHandler := health.NewHandler(reg)

	httpSrv := &http.Server{Addr: cfg.HTTPListenAddr, Handler: finalHandler}
	var httpsSrv *http.Server
	healthSrv := &http.Server{Addr: cfg.HealthListenAddr, Handler: healthHandler}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		<-sigCh
		logger.Info("shutting down")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		httpSrv.Shutdown(shutdownCtx)
		if httpsSrv != nil {
			httpsSrv.Shutdown(shutdownCtx)
		}
		healthSrv.Shutdown(shutdownCtx)
	}()

	go func() {
		if err := sshSrv.ListenAndServe(ctx); err != nil {
			logger.Error("ssh server stopped", "error", err)
		}
	}()

	go func() {
		logger.Info("http proxy listening", "addr", cfg.HTTPListenAddr)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("http proxy stopped", "error", err)
		}
	}()

	if cfg.TLSCertPath != "" && cfg.TLSKeyPath != "" {
		httpsSrv = &http.Server{Addr: cfg.HTTPSListenAddr, Handler: finalHandler}
		go func() {
			logger.Info("https proxy listening", "addr", cfg.HTTPSListenAddr)
			if err := httpsSrv.ListenAndServeTLS(cfg.TLSCertPath, cfg.TLSKeyPath); err != nil && err != http.ErrServerClosed {
				logger.Error("https proxy stopped", "error", err)
			}
		}()
	}

	go func() {
		logger.Info("health server listening", "addr", cfg.HealthListenAddr)
		if err := healthSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("health server stopped", "error", err)
		}
	}()

	<-ctx.Done()
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func loadOrGenerateHostKey() (ssh.Signer, error) {
	path := getEnv("SSH_HOST_KEY_PATH", "ssh_host_ed25519_key")

	keyBytes, err := os.ReadFile(path)
	if err == nil {
		return ssh.ParsePrivateKey(keyBytes)
	}
	if !os.IsNotExist(err) {
		return nil, fmt.Errorf("read host key %s: %w", path, err)
	}

	_, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generate host key: %w", err)
	}

	pemBlock, err := ssh.MarshalPrivateKey(crypto.PrivateKey(priv), "")
	if err != nil {
		return nil, fmt.Errorf("marshal host key: %w", err)
	}

	pemBytes := pem.EncodeToMemory(pemBlock)
	if err := os.WriteFile(path, pemBytes, 0600); err != nil {
		return nil, fmt.Errorf("save host key to %s: %w", path, err)
	}

	return ssh.ParsePrivateKey(pemBytes)
}
