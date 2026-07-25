package httpproxy

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"html"
	"net/http"
	"strings"
	"time"
)

type errorPageData struct {
	StatusCode  int
	StatusText  string
	Title       string
	Message     string
	Description string
	Subdomain   string
	ClientIP    string
	Timestamp   string
	RayID       string
	HelpText    string
	PortalURL   string
}

func generateRayID() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%x", time.Now().UnixNano())[:12]
	}
	return hex.EncodeToString(b)
}

func renderProxyError(w http.ResponseWriter, r *http.Request, statusCode int, title, message, description, helpText, subdomain string) {
	clientIP := getClientIP(r)
	portalURL := "https://tunl.online"
	nowUTC := time.Now().UTC().Format("2006-01-02 15:04:05 MST")
	rayID := generateRayID()

	// Prevent Cloudflare from intercepting 502/503/504 errors and overriding with Cloudflare's default error page
	w.Header().Set("cf-error-mode", "custom")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if strings.Contains(r.Header.Get("Accept"), "text/html") {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(statusCode)
		page := buildErrorHTML(errorPageData{
			StatusCode:  statusCode,
			StatusText:  http.StatusText(statusCode),
			Title:       title,
			Message:     message,
			Description: description,
			Subdomain:   subdomain,
			ClientIP:    clientIP,
			Timestamp:   nowUTC,
			RayID:       rayID,
			HelpText:    helpText,
			PortalURL:   portalURL,
		})
		_, _ = w.Write([]byte(page))
		return
	}

	// Return clean text response for non-HTML / CLI clients (e.g. curl)
	http.Error(w, message, statusCode)
}

func buildErrorHTML(data errorPageData) string {
	badgeBg := "rgba(239, 68, 68, 0.12)"
	badgeBorder := "rgba(239, 68, 68, 0.3)"
	badgeColor := "#f87171" // Red for 403/errors
	accentColor := "#ef4444"

	if data.StatusCode == 404 {
		badgeBg = "rgba(245, 158, 11, 0.12)"
		badgeBorder = "rgba(245, 158, 11, 0.3)"
		badgeColor = "#fbbf24" // Amber for 404
		accentColor = "#f59e0b"
	} else if data.StatusCode >= 500 {
		badgeBg = "rgba(168, 85, 247, 0.12)"
		badgeBorder = "rgba(168, 85, 247, 0.3)"
		badgeColor = "#c084fc" // Purple for 502/503
		accentColor = "#a855f7"
	}

	detailsRows := ""
	if data.ClientIP != "" {
		detailsRows += fmt.Sprintf(`
			<div class="meta-row">
				<span class="meta-label">Client IP</span>
				<code class="meta-value green">%s</code>
			</div>`, html.EscapeString(data.ClientIP))
	}
	if data.Subdomain != "" {
		detailsRows += fmt.Sprintf(`
			<div class="meta-row">
				<span class="meta-label">Subdomain</span>
				<code class="meta-value">%s</code>
			</div>`, html.EscapeString(data.Subdomain))
	}
	if data.Timestamp != "" {
		detailsRows += fmt.Sprintf(`
			<div class="meta-row">
				<span class="meta-label">Timestamp</span>
				<code class="meta-value">%s</code>
			</div>`, html.EscapeString(data.Timestamp))
	}
	if data.RayID != "" {
		detailsRows += fmt.Sprintf(`
			<div class="meta-row">
				<span class="meta-label">Ray ID</span>
				<code class="meta-value">%s</code>
			</div>`, html.EscapeString(data.RayID))
	}

	metaBoxHTML := ""
	if detailsRows != "" {
		metaBoxHTML = fmt.Sprintf(`<div class="meta-box">%s</div>`, detailsRows)
	}

	helpHTML := ""
	if data.HelpText != "" {
		helpHTML = fmt.Sprintf(`<div class="help-box" style="border-left-color: %s;">%s</div>`, accentColor, html.EscapeString(data.HelpText))
	}

	portalLink := html.EscapeString(data.PortalURL)

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>%d %s | tunl</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			background-color: #09090b;
			color: #f4f4f5;
			font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			min-height: 100vh;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 24px;
			-webkit-font-smoothing: antialiased;
		}
		.container {
			max-width: 520px;
			width: 100%%;
		}
		.brand {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-weight: 700;
			font-size: 18px;
			color: #ffffff;
			margin-bottom: 24px;
			text-decoration: none;
			transition: opacity 0.15s ease;
		}
		.brand:hover {
			opacity: 0.9;
		}
		.brand-cursor {
			display: inline-block;
			width: 8px;
			height: 16px;
			background-color: #10b981;
			margin-left: 2px;
		}
		.card {
			background-color: #121215;
			border: 1px solid #23232a;
			border-radius: 12px;
			padding: 32px;
			box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
		}
		.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 20px;
		}
		.badge {
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 12px;
			font-weight: 600;
			padding: 4px 10px;
			border-radius: 6px;
			background: %s;
			border: 1px solid %s;
			color: %s;
		}
		.title {
			font-size: 20px;
			font-weight: 600;
			color: #ffffff;
			margin-bottom: 8px;
			letter-spacing: -0.01em;
		}
		.description {
			font-size: 14px;
			color: #a1a1aa;
			line-height: 1.5;
			margin-bottom: 24px;
		}
		.meta-box {
			background-color: #09090b;
			border: 1px solid #27272a;
			border-radius: 8px;
			padding: 14px 16px;
			margin-bottom: 20px;
			display: flex;
			flex-direction: column;
			gap: 10px;
		}
		.meta-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			font-size: 13px;
		}
		.meta-label {
			color: #71717a;
			font-weight: 500;
			white-space: nowrap;
		}
		.meta-value {
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 12px;
			color: #e4e4e7;
			background: #18181b;
			padding: 3px 8px;
			border-radius: 4px;
			border: 1px solid #27272a;
			word-break: break-all;
			text-align: right;
		}
		.meta-value.green {
			color: #34d399;
			border-color: rgba(16, 185, 129, 0.2);
			background: rgba(16, 185, 129, 0.08);
		}
		.help-box {
			font-size: 13px;
			color: #a1a1aa;
			line-height: 1.55;
			background-color: rgba(255, 255, 255, 0.02);
			border-left: 3px solid #10b981;
			padding: 12px 16px;
			border-radius: 0 8px 8px 0;
			margin-bottom: 24px;
		}
		.action-row {
			margin-top: 20px;
			display: flex;
		}
		.btn-portal {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 6px;
			width: 100%%;
			padding: 10px 16px;
			font-size: 13px;
			font-weight: 600;
			color: #09090b;
			background-color: #10b981;
			border-radius: 8px;
			text-decoration: none;
			transition: all 0.15s ease;
			box-shadow: 0 2px 4px rgba(16, 185, 129, 0.15);
		}
		.btn-portal:hover {
			background-color: #34d399;
			transform: translateY(-1px);
		}
		.footer {
			margin-top: 24px;
			text-align: center;
			font-size: 12px;
			color: #52525b;
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		}
		.footer-link {
			color: #a1a1aa;
			text-decoration: none;
			font-weight: 500;
		}
		.footer-link:hover {
			color: #10b981;
			text-decoration: underline;
		}
	</style>
</head>
<body>
	<div class="container">
		<a href="%s" class="brand">
			&gt;_ tunl<span class="brand-cursor"></span>
		</a>
		<div class="card">
			<div class="header">
				<span class="badge">%d %s</span>
			</div>
			<h1 class="title">%s</h1>
			<p class="description">%s</p>
			%s
			%s
			<div class="action-row">
				<a href="%s" class="btn-portal">Go to tunl.online &rarr;</a>
			</div>
		</div>
		<div class="footer">
			<a href="%s" class="footer-link">tunl.online</a> &bull; secure edge router
		</div>
	</div>
</body>
</html>`,
		data.StatusCode, html.EscapeString(data.StatusText),
		badgeBg, badgeBorder, badgeColor,
		portalLink,
		data.StatusCode, html.EscapeString(data.StatusText),
		html.EscapeString(data.Title),
		html.EscapeString(data.Description),
		metaBoxHTML,
		helpHTML,
		portalLink,
		portalLink,
	)
}
