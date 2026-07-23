# tunl

Expose local HTTP services to the internet via SSH port forwarding (`ssh -R 80:localhost:3000 t.thakur.dev`). No client installation required.

`tunl` is an open-source reverse tunnel platform consisting of an OpenSSH-compatible tunnel daemon, a control plane, and a web dashboard.

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
|  - SSH Server (:2222)           - HTTP Proxy (:80/:443)           |
|  - Subdomain Router             - CIDR IP Whitelist Enforcement   |
+-------------------------------------------------------------------+
             |                                          |
    Key Validation & Config                     Session Activity
             |                                          |
             v                                          v
+-------------------------------------------------------------------+
|                       control-plane (Express)                     |
|  - REST API & Auth              - AES-256-GCM TOTP Storage        |
|  - PostgreSQL (Drizzle)         - Redis Session Cache             |
+-------------------------------------------------------------------+
                                  ^
                          API / Session State
                                  |
+-------------------------------------------------------------------+
|                        dashboard (Next.js)                        |
|  - Subdomain Reservations       - Live Traffic Inspector (SSE)    |
|  - Profile & Security           - Admin Console                   |
+-------------------------------------------------------------------+
```

---

## Features

- **Zero Client Dependencies**: Uses standard OpenSSH (`ssh -R`). No custom CLI or binary installation needed.
- **Subdomain Routing & Selection**:
  - Direct subdomain targeting: `ssh -R 80:localhost:3000 app@t.thakur.dev`
  - Interactive selection menu: `ssh -t -R 80:localhost:3000 t.thakur.dev`
- **Security & Access Control**:
  - Two-Factor Authentication (2FA) with TOTP authenticator apps. Secrets are encrypted using AES-256-GCM prior to storage.
  - Per-user IP whitelisting with IPv4/IPv6 CIDR evaluation (`192.168.1.100`, `10.0.0.0/8`).
- **Live Traffic Inspector**: Stream request headers and body payloads over SSE (`/inspect/[subdomain]`) with cURL exporting.
- **Operational Controls**:
  - Live active tunnel tracking and audit event logs (`tunnel.connected`, `tunnel.disconnected`).
  - Automatic stale session reclamation.

---

## Quickstart

### Prerequisites

- Node.js (v20+) & `pnpm`
- Go (v1.22+)
- PostgreSQL (v14+)
- Redis (v7+)

### Installation & Local Run

```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations
pnpm --filter control-plane exec drizzle-kit migrate

# 3. Start development servers
pnpm dev
```

---

## Usage Examples

### 1. Basic Anonymous / Ephemeral Tunnel

```bash
ssh -R 80:localhost:3000 t.thakur.dev
```

### 2. Interactive Reserved Subdomain Selection

```bash
ssh -t -R 80:localhost:3000 t.thakur.dev
```

### 3. Connect to a Specific Reserved Subdomain

```bash
ssh -R 80:localhost:3000 myapp@t.thakur.dev
```

---

## Verification & Testing

The workspace includes type checking, Vitest unit specs, and Go race detector verification.

```bash
# Run full workspace validation suite
pnpm run check

# Go tests & race detector
cd tunnel-server && go test -race ./...

# Control plane unit tests
pnpm --filter control-plane test

# TypeScript type check
pnpm --filter control-plane exec tsc --noEmit
pnpm --filter dashboard exec tsc --noEmit
```

---

## Repository Layout

```text
/tunnel-server   Go tunnel daemon: SSH server, HTTP proxy, CIDR evaluator
/control-plane   Node.js Express API: Postgres (Drizzle), Redis, AES-256-GCM crypto
/dashboard       Next.js 15 App Router interface: Inspector, Admin, Profile
/drizzle         PostgreSQL migration files
```

---

## Production Deployment

```bash
# Build assets
pnpm build

# Process management via PM2
pnpm pm2:start
pnpm pm2:status
pnpm pm2:logs
```
