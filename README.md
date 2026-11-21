# tunl

Expose local HTTP services to the internet over native OpenSSH (`ssh -p 2222 -R 80:localhost:3000 tunl.online`). No client installation, background daemon, or account required for ephemeral tunnels.

`tunl` is an open-source reverse tunnel platform consisting of an OpenSSH-compatible tunnel daemon (Go), a REST control plane (Node.js/Express/PostgreSQL), and a web dashboard (Next.js 16).

```bash
ssh -p 2222 -R 80:localhost:3000 tunl.online
```

```text
  >_ tunl █  •  ● Online
  ──────────────────────────────────────────────────────────
  Account     Anonymous Device
  Forwarding  http://localhost:3000
  Public URL  https://frosty-pine.tunl.online
  Inspector   https://tunl.online/inspect/frosty-pine
  ──────────────────────────────────────────────────────────
  Press Ctrl+C or Ctrl+D to stop the tunnel
```

> **Port 2222**: `tunl` listens on port `2222` to run without root privileges and avoid conflicts with the host system's primary SSH daemon (port 22). Always pass `-p 2222` when connecting.

---

## Features

- **Zero Client Dependencies**: Uses standard OpenSSH (`ssh -R`). Works out of the box on macOS, Linux, and Windows.
- **Real-Time Request Inspector**: Live HTTP telemetry streamed over Server-Sent Events (SSE) at `/inspect/[subdomain]` with one-click cURL export.
- **Persistent & Custom Subdomains**: Reserve fixed subdomains linked to your SSH public key (`app@tunl.online`).
- **Custom Domains**: Bring your own domain (`app.example.com`) — CNAME it at tunl, prove ownership with a TXT record, and route it at a live tunnel.
- **Interactive Subdomain Selection**: TTY menu (`ssh -p 2222 -t ...`) to pick from assigned subdomains or generate a random one.
- **Tunnel Password Protection**: Lock public endpoints with password protection via dashboard settings.
- **CIDR IP Allowlisting**: Restrict tunnel ingress by IPv4/IPv6 CIDR ranges (`192.168.1.0/24`).
- **WebSocket & SSE Pass-Through**: Full HTTP/1.1 Upgrade handling for WebSockets, SSE streams, and Vite/Next.js HMR.
- **Bandwidth Analytics & Auditing**: Live session tracking, transfer volume metrics, and key-level session revocation.
- **Self-Hostable**: Monorepo architecture with clean separation between data plane (Go) and control plane (TypeScript).

---

## Quickstart

### Ephemeral Tunnel

Forward any local port to a public HTTPS URL:

```bash
ssh -p 2222 -R 80:localhost:3000 tunl.online
```

Forward a custom local port (e.g. 5173, 8080):

```bash
ssh -p 2222 -R 80:localhost:5173 tunl.online
```

### Reserved Subdomain

If you have claimed a subdomain on [tunl.online](https://tunl.online), specify it as the SSH user:

```bash
ssh -p 2222 -R 80:localhost:3000 myapp@tunl.online
```

### Interactive Subdomain Picker

If your account has multiple reserved subdomains, allocate a pseudo-terminal with `-t` to choose dynamically:

```bash
ssh -p 2222 -t -R 80:localhost:3000 tunl.online
```

### SSH Config Alias

To avoid typing `-p 2222` and host details every time, add this to `~/.ssh/config`:

```ssh-config
Host tunl
    HostName tunl.online
    Port 2222
    ServerAliveInterval 15
    ServerAliveCountMax 3
```

Then run:

```bash
# Ephemeral
ssh -R 80:localhost:3000 tunl

# Reserved subdomain
ssh -R 80:localhost:3000 myapp@tunl
```

### Custom Domains

Serve a reserved tunnel on your own domain (`app.example.com`):

1. **Reserve a subdomain** (e.g. `myapp`) so the tunnel has a stable identity.
2. In the dashboard, open **Custom domains**, enter your domain, and pick the target tunnel.
3. Create two DNS records at your registrar (in your domain's zone, e.g. `example.com`):

   | Type    | Name                  | Value               |
   | ------- | --------------------- | ------------------- |
   | `CNAME` | `app`                 | `cname.tunl.online` |
   | `TXT`   | `_tunl-challenge.app` | your one-time token |

4. Click **Verify DNS**. A matching `CNAME` _or_ `TXT` record proves ownership; only then does the edge route the domain.
5. For TLS, proxy the `CNAME` through **Cloudflare** (orange cloud) or Cloudflare for SaaS — Cloudflare terminates HTTPS and forwards to the tunl origin, which resolves the `Host` header to your tunnel.

Custom domains reuse the tunnel's password protection, CIDR allowlist, request inspector, and analytics. Plan limits are controlled by `plans.max_custom_domains` (set `0` to disable).

---

## Architecture

```
                       +----------------------+
                       |  HTTP / SSH Clients  |
                       +----------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                        tunnel-server (Go)                         |
|  - SSH Server (:2222)           - HTTP Proxy (:8080 / :443)       |
|  - Subdomain Router             - CIDR & Password Enforcement     |
|  - WebSocket & SSE Upgrades     - Request Telemetry Capture       |
+-------------------------------------------------------------------+
             |                                          |
    Key Validation & Config                     Session Activity
             |                                          |
             v                                          v
+-------------------------------------------------------------------+
|                       control-plane (Express)                     |
|  - REST API & Auth              - AES-256-GCM TOTP Secrets        |
|  - PostgreSQL (Drizzle)         - Redis Session & Event Bus       |
+-------------------------------------------------------------------+
                                  ^
                          API / Session State
                                  |
+-------------------------------------------------------------------+
|                        dashboard (Next.js 16)                     |
|  - Subdomain Reservations       - Live Traffic Inspector (SSE)    |
|  - Profile & Security           - Bandwidth Analytics             |
+-------------------------------------------------------------------+
```

### Service Ports

| Service                  | Port   | Description                                      |
| :----------------------- | :----- | :----------------------------------------------- |
| `tunnel-server` (SSH)    | `2222` | Inbound SSH reverse tunnels                      |
| `tunnel-server` (HTTP)   | `8080` | Inbound HTTP traffic routed to active tunnels    |
| `tunnel-server` (Health) | `9090` | Daemon health check endpoint (`/healthz`)        |
| `control-plane`          | `3001` | Core REST API, authentication, and session state |
| `dashboard`              | `3000` | Web UI, key management, and traffic inspector    |

---

## Local Development

### Prerequisites

- **Bun** `1.4+` (or **Node.js** `20+`)
- **Go** `1.22+`
- **PostgreSQL** `14+`
- **Redis** `7+`
- **OpenSSH** client (`ssh -V`)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/thakurdotdev/tunl.git
cd tunl
bun install
```

### 2. Environment Configuration

Copy the example configuration files:

```bash
cp control-plane/.env.example control-plane/.env
cp tunnel-server/.env.example tunnel-server/.env
```

Ensure the databases and shared secrets are set:

**`control-plane/.env`**:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tunnel_saas
REDIS_URL=redis://localhost:6379/0
PORT=3001
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
INTERNAL_SHARED_SECRET=changeme-shared-secret-at-least-16-chars
DASHBOARD_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-random-secret-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3001
```

**`tunnel-server/.env`**:

```env
BASE_DOMAIN=localhost
TUNNEL_URL_SCHEME=http
SSH_LISTEN_ADDR=:2222
HTTP_LISTEN_ADDR=:8080
HEALTH_LISTEN_ADDR=:9090
CONTROL_PLANE_URL=http://localhost:3001
INTERNAL_SHARED_SECRET=changeme-shared-secret-at-least-16-chars
REDIS_URL=redis://localhost:6379/0
REQUEST_LOG_ENABLED=true
LOG_LEVEL=info
```

**Abuse limits** (all optional; defaults shown). Long-lived tunnels are never
timed out; these only bound what one visitor or tunnel can cost the server.

```env
# Only these peers may set the visitor IP via X-Real-IP (nginx on loopback).
TRUSTED_PROXIES=127.0.0.0/8,::1/128
# Requests/sec and burst per visitor IP and per tunnel. Over-limit gets 429.
RATE_LIMIT_IP_RPS=100
RATE_LIMIT_IP_BURST=400
RATE_LIMIT_TUNNEL_RPS=300
RATE_LIMIT_TUNNEL_BURST=800
# Escalating penalties: 10 over-limit seconds within 5 min bans an IP for
# 1m → 10m → 1h → 24h, and halves a tunnel's bandwidth (then 1/4, 1/8…).
BANS_ENABLED=true
# Request body caps.
MAX_BODY_ANON_MB=10
MAX_BODY_USER_MB=100
# Concurrency: in-flight HTTP per tunnel (queues up to the wait, then 503),
# server-wide, and open WebSockets per tunnel / per visitor IP.
MAX_INFLIGHT_PER_TUNNEL=200
INFLIGHT_WAIT_SECONDS=10
MAX_INFLIGHT_TOTAL=4000
MAX_WS_PER_TUNNEL=200
MAX_WS_PER_IP=30
# Bandwidth per tunnel, both directions combined (MB/s).
BANDWIDTH_ANON_MB_PER_SEC=10
BANDWIDTH_USER_MB_PER_SEC=30
# Give up on a local app that hasn't started responding.
RESPONSE_HEADER_TIMEOUT_SECONDS=120
# SSH: anonymous connections per IP, connections per account (plans with a
# tunnel cap get cap + 3), and how long a connection may sit without a tunnel.
MAX_CONNS_PER_IP=10
MAX_SSH_CONNS_PER_USER=20
SSH_FORWARD_TIMEOUT_SECONDS=60
```

In production, nginx must sit in front with `deploy/nginx/tunl-*.conf`
installed: it restores the visitor IP from Cloudflare, drops tunnel-host
traffic that didn't come through Cloudflare, and adds coarse per-IP limits.
Install nginx changes **before** a tunneld that trusts `X-Real-IP`, and run
`deploy/nginx/update-cloudflare-ips.sh` to install or refresh Cloudflare's
ranges.

**`dashboard/.env`**:

```env
NEXT_PUBLIC_CONTROL_PLANE_URL=http://localhost:3001
```

### 3. Database Migration

Initialize the PostgreSQL schema:

```bash
bun db:migrate

# Optional: populate seed data
bun db:seed
```

### 4. Run Development Stack

Start `control-plane`, `dashboard`, and `tunnel-server` in parallel:

```bash
bun dev
```

### 5. Verify Local Tunnel

1. Start a dummy HTTP server:

   ```bash
   python3 -m http.server 5000
   ```

2. Establish an SSH tunnel against the local daemon using `-p 2222`:

   ```bash
   ssh -p 2222 -R 80:localhost:5000 localhost
   ```

3. The terminal outputs your assigned local subdomain (e.g. `sunny-lake`):

   ```text
     >_ tunl █  •  ● Online
     ──────────────────────────────────────────────────────────
     Account     Anonymous Device
     Forwarding  http://localhost:5000
     Public URL  http://sunny-lake.localhost:8080
     Inspector   http://localhost:3000/inspect/sunny-lake
     ──────────────────────────────────────────────────────────
   ```

4. Send a request to the tunnel proxy:

   ```bash
   curl -H "Host: sunny-lake.localhost" http://localhost:8080
   ```

5. Open the traffic inspector at `http://localhost:3000/inspect/sunny-lake` to inspect headers, payloads, and round-trip timings in real time.

---

## Testing & Quality

Run the workspace validation suite:

```bash
# Full check: bun fmt check + bun lint + Vitest + Go race tests
bun run check

# Go unit tests & race detector
cd tunnel-server && go test -race ./...

# Control plane unit tests
bun --filter control-plane test

# TypeScript type checks
bun --filter control-plane exec tsc --noEmit
bun --filter dashboard exec tsc --noEmit
```

---

## Production Deployment

### PM2

Production process orchestration is configured via [ecosystem.config.js](ecosystem.config.js). It runs the control plane and tunnel daemon; the dashboard has no process of its own (see below).

```bash
# Build production assets (dashboard is exported to dashboard/out)
bun run build

# Start services under PM2
pm2 start ecosystem.config.js

# Monitor
pm2 status
pm2 logs
```

### Dashboard (static export)

The dashboard is built with `output: "export"`, so `bun run build` writes plain HTML/JS/CSS to `dashboard/out`, and nginx serves those files directly. There is no Node server for it, so redirects, headers and rewrites belong in nginx, not `next.config.ts`. `NEXT_PUBLIC_CONTROL_PLANE_URL` is baked in at build time.

Preview the export locally with `bun --filter dashboard start`.

### Reverse Proxy (Nginx)

In production, Nginx sits in front of everything. See [deploy/nginx/tunl.online.conf](deploy/nginx/tunl.online.conf) for the `tunl.online` block:

- `tunl.online` -> static files from `dashboard/out`; `tunl.online/api` -> API (`:3091`)
- Legacy `/inspect/<subdomain>` links are 301-redirected to `/inspect/requests?subdomain=<subdomain>`
- `*.tunl.online` -> Tunnel HTTP proxy (`:8088`) with WebSocket upgrade headers
- Open port `2222` on your firewall for incoming SSH tunnels:
  ```bash
  sudo ufw allow 2222/tcp comment "tunl SSH reverse tunnels"
  ```

---

## Comparison

| Feature                   |              tunl              |      ngrok       | Cloudflare Tunnel | localtunnel |
| :------------------------ | :----------------------------: | :--------------: | :---------------: | :---------: |
| **Client Requirement**    | Native OpenSSH (`ssh -p 2222`) | Proprietary CLI  |   `cloudflared`   |  Node CLI   |
| **Anonymous / Ephemeral** |           Supported            | Account required | Account required  |  Supported  |
| **License**               |     MIT (100% Open Source)     | Proprietary core | Proprietary edge  |     MIT     |
| **Self-Hostable**         |              Yes               |        No        |  Enterprise only  |  Abandoned  |
| **Request Inspector**     |      Built-in SSE + cURL       |  Web interface   |  Dashboard only   |     No      |
| **Subdomain Reservation** |      SSH Key fingerprint       |    Paid plans    |        Yes        | Unreliable  |
| **CIDR IP Allowlist**     |            Built-in            |    Paid plans    | Cloudflare Access |     No      |
| **Tunnel Passwords**      |            Built-in            |    Paid plans    |  Access policies  |     No      |
| **WebSocket / HMR**       |             Native             |    Supported     |     Supported     |   Partial   |

---

## License

MIT License. See [LICENSE](file:///mnt/dev/tunl/LICENSE) for details.

Copyright (c) 2026 Pankaj Thakur.
