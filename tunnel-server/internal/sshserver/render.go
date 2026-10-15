package sshserver

import (
	"fmt"
	"io"
	"time"
)

func renderTerminalBanner(ch io.Writer, s *Server, sess *sshSession) {
	accountStr := sess.Email()
	if accountStr == "" {
		accountStr = "Anonymous Device"
	}
	plan := sess.Plan()
	if plan != "" {
		accountStr = fmt.Sprintf("%s (%s plan)", accountStr, plan)
	}

	localTarget := "\033[1;33mLocal port\033[0m \033[90m(via ssh -R)\033[0m"
	if target := sess.LocalTarget(); target != "" {
		localTarget = fmt.Sprintf("\033[1;33m%s\033[0m", target)
	}

	inspectorURL := fmt.Sprintf("%s://%s/inspect/%s", s.tunnelScheme, s.baseDomain, sess.Subdomain())

	fmt.Fprintf(ch, "\r\033[2K  \033[1;32m>_\033[0m \033[1;37mtunl\033[0m \033[1;32m█\033[0m  \033[90m•\033[0m  \033[1;32m● Online\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mAccount    \033[0m \033[1;37m%s\033[0m\r\n", accountStr)
	fmt.Fprintf(ch, "  \033[90mForwarding \033[0m %s\r\n", localTarget)
	fmt.Fprintf(ch, "  \033[90mPublic URL \033[0m \033[4;34m%s\033[0m\r\n", sess.TunnelURL())
	if domain := sess.CustomDomainFor(sess.Subdomain()); domain != "" {
		fmt.Fprintf(ch, "  \033[90mCustom URL \033[0m \033[4;34m%s://%s\033[0m\r\n", s.tunnelScheme, domain)
	}
	fmt.Fprintf(ch, "  \033[90mInspector  \033[0m \033[4;34m%s\033[0m\r\n", inspectorURL)
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mPress \033[1;37mCtrl+C\033[0m \033[90mor\033[0m \033[1;37mCtrl+D\033[0m \033[90mto stop the tunnel\033[0m\r\n\r\n")
}

func renderTerminalClose(ch io.Writer) {
	fmt.Fprintf(ch, "\r\033[2K\r\n  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[1;33m●\033[0m \033[1;37mTunnel closed\033[0m  \033[90mSession ended. Goodbye!\033[0m\r\n\r\n")
}

func renderTerminalExpiry(ch io.Writer, s *Server) {
	homeURL := fmt.Sprintf("%s://%s", s.tunnelScheme, s.baseDomain)
	fmt.Fprintf(ch, "\r\n")
	fmt.Fprintf(ch, "  \033[1;33m⏱ Anonymous Session Limit Reached (%v max)\033[0m\r\n", s.anonMaxDuration)
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  Sign up at \033[4;34m%s\033[0m for persistent tunnels & custom subdomains.\r\n", homeURL)
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n\r\n")
}

func renderTerminalError(ch io.Writer, s *Server, errMsg string) {
	homeURL := fmt.Sprintf("%s://%s", s.tunnelScheme, s.baseDomain)
	fmt.Fprintf(ch, "\r\033[2K\r\n")
	fmt.Fprintf(ch, "  \033[1;32m>_\033[0m \033[1;37mtunl\033[0m \033[1;32m█\033[0m  \033[90m•\033[0m  \033[1;31m✖ Tunnel Error\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mReason\033[0m     %s\r\n", errMsg)
	fmt.Fprintf(ch, "  \033[90mDashboard\033[0m  \033[4;34m%s\033[0m\r\n", homeURL)
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n\r\n")
}

// promptSubdomainSelection renders the multi-subdomain selection menu over SSH TTY.
func promptSubdomainSelection(sess *sshSession, available []string, baseDomain string) string {
	w := sess.waitForTerminalWriter(300 * time.Millisecond)

	if w == nil {
		return available[0]
	}

	fmt.Fprintf(w, "\r\033[2K\r\n")
	fmt.Fprintf(w, "  \033[1;32m>_\033[0m \033[1;37mtunl\033[0m \033[1;32m█\033[0m  \033[90m•\033[0m  \033[1;33mSelect Reserved Subdomain\033[0m\r\n")
	fmt.Fprintf(w, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(w, "  Multiple available reserved subdomains found for your account:\r\n\r\n")

	for i, sub := range available {
		if domain := sess.CustomDomainFor(sub); domain != "" {
			fmt.Fprintf(w, "    \033[1;32m[%d]\033[0m \033[1;37m%s.%s\033[0m \033[90m→ %s\033[0m\r\n", i+1, sub, baseDomain, domain)
		} else {
			fmt.Fprintf(w, "    \033[1;32m[%d]\033[0m \033[1;37m%s.%s\033[0m\r\n", i+1, sub, baseDomain)
		}
	}
	randomIdx := len(available) + 1
	fmt.Fprintf(w, "    \033[1;30m[%d]\033[0m \033[90m(Use random ephemeral subdomain)\033[0m\r\n\r\n", randomIdx)
	fmt.Fprintf(w, "  \033[1;36mSelect subdomain [1-%d] (default 1):\033[0m ", randomIdx)

	choice := sess.ReadTerminalInput(15 * time.Second)

	var chosen string
	if choice == "" || choice == "1" || choice == "\r" || choice == "\n" {
		chosen = available[0]
	} else if choice == fmt.Sprintf("%d", randomIdx) {
		chosen = "__random__"
	} else {
		var idx int
		if n, _ := fmt.Sscanf(choice, "%d", &idx); n == 1 && idx >= 1 && idx <= len(available) {
			chosen = available[idx-1]
		} else {
			chosen = available[0]
		}
	}

	if chosen == "__random__" {
		fmt.Fprintf(w, "\r\n  \033[1;32m✔ Selected:\033[0m \033[1;37mRandom Ephemeral Subdomain\033[0m\r\n\r\n")
	} else {
		fmt.Fprintf(w, "\r\n  \033[1;32m✔ Selected:\033[0m \033[1;37m%s.%s\033[0m\r\n\r\n", chosen, baseDomain)
	}

	return chosen
}
