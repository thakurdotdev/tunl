// Package logging sets up log/slog with the standard field set used across
// tunneld: session_id, subdomain, user_id, remote_ip, request_id.
// Init() right after config (plan section 1.3, step 2) so every other
// package can assume slog.Default() is already configured.
package logging

import (
	"log/slog"
	"os"
)

func Init(level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}

// Standard field names — use these consistently so log lines are greppable
// across packages.
const (
	FieldSessionID = "session_id"
	FieldSubdomain = "subdomain"
	FieldUserID    = "user_id"
	FieldRemoteIP  = "remote_ip"
	FieldRequestID = "request_id"
)
