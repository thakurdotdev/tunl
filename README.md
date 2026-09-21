# tunl

Expose local HTTP services to the internet over native OpenSSH (`ssh -p 2222 -R 80:localhost:3000 tunl.online`). No client installation, background daemon, or account required for ephemeral tunnels.

`tunl` is an open-source reverse tunnel platform consisting of an OpenSSH-compatible tunnel daemon (Go), a REST control plane (Node.js/Express/PostgreSQL), and a web dashboard (Next.js 15).

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
|                        dashboard (Next.js 15)                     |
|  - Subdomain Reservations       - Live Traffic Inspector (SSE)    |
|  - Profile & Security           - Bandwidth Analytics             |
+-------------------------------------------------------------------+
```

### Service Ports

| Service | Port | Description |
| :--- | :--- | :--- |
| `tunnel-server` (SSH) | `2222` | Inbound SSH reverse tunnels |
| `tunnel-server` (HTTP) | `8080` | Inbound HTTP traffic routed to active tunnels |
| `tunnel-server` (Health) | `9090` | Daemon health check endpoint (`/healthz`) |
| `control-plane` | `3001` | Core REST API, authentication, and session state |
| `dashboard` | `3000` | Web UI, key management, and traffic inspector |

---

## Local Development

### Prerequisites

- **Node.js** `20+` and **pnpm** `9+`
- **Go** `1.22+`
- **PostgreSQL** `14+`
- **Redis** `7+`
- **OpenSSH** client (`ssh -V`)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/thakurdotdev/tunl.git
cd tunl
pnpm install
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

**`dashboard/.env`**:
```env
NEXT_PUBLIC_CONTROL_PLANE_URL=http://localhost:3001
```

### 3. Database Migration

Initialize the PostgreSQL schema:

```bash
pnpm db:migrate

# Optional: populate seed data
pnpm db:seed
```

### 4. Run Development Stack

Start `control-plane`, `dashboard`, and `tunnel-server` in parallel:

```bash
pnpm dev
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
# Full check: oxfmt check + oxlint + Vitest + Go race tests
pnpm run check

# Go unit tests & race detector
cd tunnel-server && go test -race ./...

# Control plane unit tests
pnpm --filter control-plane test

# TypeScript type checks
pnpm --filter control-plane exec tsc --noEmit
pnpm --filter dashboard exec tsc --noEmit
```

---

## Production Deployment

### PM2

Production process orchestration is configured via [ecosystem.config.js](file:///mnt/dev/tunl/ecosystem.config.js):

```bash
# Build production assets
pnpm build

# Start services under PM2
pm2 start ecosystem.config.js

# Monitor
pm2 status
pm2 logs
```

### Reverse Proxy (Nginx)

In production, place Nginx in front of the HTTP proxy and dashboard. See [shared/nginx.conf](file:///mnt/dev/tunl/shared/nginx.conf) for reference:

- `tunl.online` & `tunl.online/api` -> Dashboard (`:3090`) and API (`:3091`)
- `*.tunl.online` -> Tunnel HTTP proxy (`:8088`) with WebSocket upgrade headers
- Open port `2222` on your firewall for incoming SSH tunnels:
  ```bash
  sudo ufw allow 2222/tcp comment "tunl SSH reverse tunnels"
  ```

---

## Comparison

| Feature | tunl | ngrok | Cloudflare Tunnel | localtunnel |
| :--- | :---: | :---: | :---: | :---: |
| **Client Requirement** | Native OpenSSH (`ssh -p 2222`) | Proprietary CLI | `cloudflared` | Node CLI |
| **Anonymous / Ephemeral** | Supported | Account required | Account required | Supported |
| **License** | MIT (100% Open Source) | Proprietary core | Proprietary edge | MIT |
| **Self-Hostable** | Yes | No | Enterprise only | Abandoned |
| **Request Inspector** | Built-in SSE + cURL | Web interface | Dashboard only | No |
| **Subdomain Reservation** | SSH Key fingerprint | Paid plans | Yes | Unreliable |
| **CIDR IP Allowlist** | Built-in | Paid plans | Cloudflare Access | No |
| **Tunnel Passwords** | Built-in | Paid plans | Access policies | No |
| **WebSocket / HMR** | Native | Supported | Supported | Partial |

---

## License

MIT License. See [LICENSE](file:///mnt/dev/tunl/LICENSE) for details.

Copyright (c) 2026 Pankaj Thakur.
