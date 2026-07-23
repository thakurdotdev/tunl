package sshserver

import (
	"fmt"
	"io"
	"strings"
	"time"
)

// renderTerminalBanner outputs the primary TUNL startup banner when a tunnel is ready.
func renderTerminalBanner(ch io.Writer, s *Server, sess *sshSession) {
	url := sess.TunnelURL()
	subdomain := sess.Subdomain()
	homeURL := fmt.Sprintf("%s://tunl.%s", s.tunnelScheme, s.baseDomain)
	inspectURL := fmt.Sprintf("%s://tunl.%s/inspect/%s", s.tunnelScheme, s.baseDomain, subdomain)

	targetHost := sess.BindAddr()
	if targetHost == "" || targetHost == "0.0.0.0" || targetHost == "127.0.0.1" {
		targetHost = "localhost"
	}
	forwardTarget := fmt.Sprintf("http://%s", targetHost)
	if sess.BindPort() != 80 && sess.BindPort() != 443 {
		forwardTarget = fmt.Sprintf("http://%s:%d", targetHost, sess.BindPort())
	}

	accountStr := "\033[90mAnonymous\033[0m"
	if sess.UserID() != "" {
		planStr := sess.Plan()
		if planStr == "" {
			planStr = "standard"
		}
		accountStr = fmt.Sprintf("\033[1;37m%s\033[0m \033[36m(%s plan)\033[0m", sess.Email(), planStr)
	}

	fmt.Fprintf(ch, "\r\n")
	fmt.Fprintf(ch, "  \033[1;36m⚡ TUNL\033[0m  \033[90m•\033[0m  \033[1;32m● Online\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mAccount\033[0m     %s\r\n", accountStr)
	fmt.Fprintf(ch, "  \033[90mForwarding\033[0m  \033[1;33m%s\033[0m\r\n", forwardTarget)
	fmt.Fprintf(ch, "  \033[90mPublic URL\033[0m  \033[1;4;36m%s\033[0m\r\n", url)
	if sess.UserID() != "" {
		fmt.Fprintf(ch, "  \033[90mInspector\033[0m   \033[4;34m%s\033[0m\r\n", inspectURL)
	}

	if sess.UserID() == "" && s.anonMaxDuration > 0 {
		hours := int(s.anonMaxDuration.Hours())
		fmt.Fprintf(ch, "  \033[90mExpires\033[0m     \033[33m%d hours\033[0m (sign up for unlimited)\r\n", hours)
	}

	if sess.UserID() != "" && sess.AllowedSubdomain() == "" {
		fmt.Fprintf(ch, "\r\n  \033[33m💡 Tip:\033[0m Reserve a custom domain at \033[4;34m%s\033[0m\r\n", homeURL)
	} else if sess.UserID() == "" {
		fmt.Fprintf(ch, "\r\n  \033[33m💡 Tip:\033[0m Sign up for unlimited tunnels at \033[4;34m%s\033[0m\r\n", homeURL)
	}

	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mPress \033[1;37mCtrl+C\033[0;90m or \033[1;37mCtrl+D\033[0;90m to stop the tunnel\033[0m\r\n\r\n")
}

// renderTerminalExpiry handles session expiration banners.
func renderTerminalExpiry(ch io.Writer, s *Server) {
	homeURL := fmt.Sprintf("%s://tunl.%s", s.tunnelScheme, s.baseDomain)
	fmt.Fprintf(ch, "\r\n")
	fmt.Fprintf(ch, "  \033[1;33m⏰ Session Expired\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mReason\033[0m     Anonymous tunnel time limit reached\r\n")
	fmt.Fprintf(ch, "  \033[90mNext\033[0m       Reconnect to start a new session, or\r\n")
	fmt.Fprintf(ch, "             sign up at \033[4;34m%s\033[0m for unlimited tunnels\r\n", homeURL)
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n\r\n")
}

// renderTerminalError handles connection error banners.
func renderTerminalError(ch io.Writer, s *Server, errMsg string) {
	homeURL := fmt.Sprintf("%s://tunl.%s", s.tunnelScheme, s.baseDomain)
	fmt.Fprintf(ch, "\r\n")
	fmt.Fprintf(ch, "  \033[1;31m✖ Tunnel Error\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mReason\033[0m     %s\r\n", errMsg)
	fmt.Fprintf(ch, "  \033[90mDashboard\033[0m  \033[4;34m%s\033[0m\r\n", homeURL)
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n\r\n")
}

// promptSubdomainSelection renders the multi-subdomain selection menu over SSH TTY.
func promptSubdomainSelection(sess *sshSession, available []string, baseDomain string) string {
	sess.mu.Lock()
	w := sess.termWriter
	sess.mu.Unlock()

	if w == nil {
		return available[0]
	}

	fmt.Fprintf(w, "\r\n")
	fmt.Fprintf(w, "  \033[1;36m⚡ TUNL\033[0m  \033[90m•\033[0m  \033[1;33mSelect Reserved Subdomain\033[0m\r\n")
	fmt.Fprintf(w, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(w, "  Multiple available reserved subdomains found for your account:\r\n\r\n")

	for i, sub := range available {
		fmt.Fprintf(w, "    \033[1;32m[%d]\033[0m \033[1;37m%s.%s\033[0m\r\n", i+1, sub, baseDomain)
	}
	randomIdx := len(available) + 1
	fmt.Fprintf(w, "    \033[1;30m[%d]\033[0m \033[90m(Use random ephemeral subdomain)\033[0m\r\n\r\n", randomIdx)
	fmt.Fprintf(w, "  Select subdomain [1-%d] (default 1): ", randomIdx)

	inputCh := make(chan string, 1)
	go func() {
		buf := make([]byte, 16)
		n, err := sess.ReadTerminalInput(buf)
		if err != nil || n == 0 {
			inputCh <- ""
			return
		}
		inputCh <- strings.TrimSpace(string(buf[:n]))
	}()

	select {
	case choice := <-inputCh:
		fmt.Fprintf(w, "\r\n\r\n")
		if choice == "" || choice == "1" || choice == "\r" || choice == "\n" {
			return available[0]
		}
		if choice == fmt.Sprintf("%d", randomIdx) {
			return "__random__"
		}
		var idx int
		if n, _ := fmt.Sscanf(choice, "%d", &idx); n == 1 && idx >= 1 && idx <= len(available) {
			return available[idx-1]
		}
		return available[0]
	case <-time.After(15 * time.Second):
		fmt.Fprintf(w, " 1 (timeout)\r\n\r\n")
		return available[0]
	}
}
