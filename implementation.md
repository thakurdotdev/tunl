# Reverse SSH Tunnel SaaS — Implementation Plan

**Goal:** a localhost.run/ngrok-style product. Users run plain `ssh -R 80:localhost:3000 sub@tunl.dev` — no client binary. Anonymous tier works instantly; authenticated tier (SSH public key tied to an account) gets reserved subdomains and billing.

**Scale target for now:** single instance per service, no horizontal scaling, no multi-region. Optimize for clean modular code and testability, not throughput. Assume dozens of concurrent tunnels, not thousands.

**Stack:** Go (tunnel core) · NestJS + TypeScript + Postgres (control plane) · Next.js + TypeScript (dashboard)

---

## 0. Repo layout

Monorepo, three top-level services plus shared contracts:

```
/tunnel-saas
  /tunnel-server        (Go)
  /control-plane         (NestJS)
  /dashboard             (Next.js)
  /shared
    openapi.yaml          # contract between Go <-> Nest internal API
    docker-compose.yml     # postgres, redis, all 3 services for local dev
  /docs
    architecture.md
```

Each service is independently runnable. `docker-compose up` should bring up Postgres, Redis, and all three apps for local dev.

---

## 1. Module: Go tunnel server (`/tunnel-server`)

This is the highest-risk, least-familiar module — build and test it first, in isolation, before wiring in NestJS.

### 1.1 Package layout

```
/tunnel-server
  /cmd/tunneld/main.go        # entrypoint: load config, init logging, then wire everything else
  /internal/sshserver         # SSH connection handling — ONLY manages SSH sessions, no HTTP/routing logic
    server.go                  # ssh.ServerConfig, Listen, Accept loop
    auth.go                     # PublicKeyCallback + anonymous fallback, calls controlclient (cached)
    forward.go                  # handles "tcpip-forward" global request
    channel.go                  # handles inbound "forwarded-tcpip" channel open
    session.go                   # sshSession struct implementing registry.TunnelConnection
  /internal/registry           # subdomain -> Tunnel mapping — ONLY tracks state, transport-agnostic
    registry.go                 # in-memory map, mutex-guarded; ActiveCount/AnonymousCount/ReservedCount
    registry_test.go            # concurrency tests with -race
  /internal/httpproxy          # public-facing HTTP(S) listener — ONLY routes using the registry
    proxy.go                    # net/http + httputil.ReverseProxy, Host header routing
    websocket.go                 # Upgrade detection + Hijack-based splice for WS
    tls.go                      # cert loading (single wildcard cert file; ACME later)
  /internal/controlclient      # thin HTTP client to call NestJS internal API, with built-in TTL cache
    client.go                   # ValidateKey(ctx, fingerprint) (*User, error), ReportUsage(ctx, ...)
    cache.go                     # TTL cache wrapping ValidateKey — implementation detail, not its own package
  /internal/config
    config.go                   # env-based config struct — loaded first, before anything else
  /internal/health
    health.go                   # /health, /ready, /metrics (Prometheus) — metrics read from registry.Active/Anonymous/ReservedCount, no duplicate counters
  /internal/logging
    logging.go                   # log/slog setup — initialized second, right after config
  go.mod
```

### 1.2 Core interfaces to define first (before implementation)

```go
// registry.go
type Tunnel struct {
    Subdomain     string
    UserID        string    // empty for anonymous tunnels
    Reserved      bool      // true if tied to a paid/authenticated reservation
    CreatedAt     time.Time
    LastSeen      time.Time
    Conn          TunnelConnection
}

type TunnelRegistry interface {
    Register(t *Tunnel) error          // error if subdomain taken
    Lookup(subdomain string) (*Tunnel, bool)
    UpdateActivity(subdomain string)    // bumps LastSeen; cancels a pending grace-window removal if in progress
    Unregister(subdomain string)
    MarkDisconnected(subdomain string)  // starts grace window instead of immediate unregister

    // Metrics read these directly instead of maintaining separate counters
    ActiveCount() int
    AnonymousCount() int
    ReservedCount() int
}

// TunnelConnection is transport-agnostic — the registry and httpproxy never know SSH exists.
// Only sshserver implements this (as sshSession in session.go). A future TCP-only or other
// transport could implement the same interface without touching registry or httpproxy.
type TunnelConnection interface {
    ID() string
    UserID() string                 // empty string for anonymous sessions
    Done() <-chan struct{}          // closed when the underlying connection ends
    Dial(ctx context.Context, remoteAddr string, remotePort uint32) (io.ReadWriteCloser, error)
    Close() error
}

// controlclient/client.go
type KeyValidator interface {
    ValidateKey(ctx context.Context, fingerprint string) (userID string, allowedSubdomain string, plan string, err error)
}
```

Defining these as interfaces up front means the Go agent (Claude Code / Codex) can implement `registry.go` and write its unit tests without needing a real SSH connection, and `httpproxy` can be tested against a fake `TunnelRegistry`.

**Design note on `KeyValidator`'s single `allowedSubdomain`:** the default plan caps a user at one reserved subdomain, so a single string return is intentionally sufficient for v1. If a future plan allows more than one reserved subdomain per account, this contract needs to grow — either the SSH username carries the requested subdomain (`ssh -R 80:localhost:3000 myapp@tunl.dev`) and `validate-key` takes `{fingerprint, requestedSubdomain}` and checks ownership, or `validate-key` returns a list and the server picks one by convention. Don't build that now; just don't be surprised when a second reserved subdomain shows up and this contract needs to change.

**Design notes on the reconnect grace window:** `MarkDisconnected` should start a timer (10-15s) before the entry is actually removed from the registry. This does **not** mean in-flight public requests succeed during an outage — if the connection is down, `httpproxy` still returns 503 for that subdomain. What the grace window protects against is (a) someone else grabbing a just-freed anonymous subdomain, and (b) the dashboard status flapping connected/disconnected on a brief network blip. If the same user reconnects with the same key/subdomain within the window, `UpdateActivity` cancels the pending removal.

**Design note on `context.Context`:** every `TunnelConnection.Dial` call and every `controlclient` call takes a `ctx`. This lets `httpproxy` apply a per-request timeout on the SSH-backed dial, and lets `main.go` cancel in-flight control-plane calls cleanly on SIGTERM instead of leaving goroutines hanging.

**Design note on cache staleness:** the `controlclient` cache TTL is a deliberate consistency/latency tradeoff, not an oversight — a revoked key or downgraded plan can stay valid for up to one TTL window after the change lands in Postgres. Keep the TTL in `config.go` (env-configurable) rather than hardcoded, so it can be tuned per environment (shorter in staging, longer in prod) without a code change.

**Design note on port choice:** if `tunneld`'s SSH listener runs on the same host you administer, don't bind it to port 22 — that collides with your own admin SSH access. Put the SSH listener on a dedicated port (e.g. `2222`, configurable in `config.go`) and keep host admin SSH on its usual port and interface.

### 1.3 Task breakdown (in order)

1. **`internal/config`** — env-based config struct (SSH listen port — distinct from the host's admin SSH port — HTTP/HTTPS listen ports, wildcard cert paths, control-plane URL, internal shared secret, cache TTL). Load this before anything else in `main.go`.
2. **`internal/logging`** — set up `log/slog` with a standard field set (`session_id`, `subdomain`, `user_id`, `remote_ip`, `request_id`) initialized right after config, so every other package can assume a logger already exists.
3. **`internal/registry`** — in-memory `Tunnel` registry with `Register`/`Lookup`/`UpdateActivity`/`Unregister`/`MarkDisconnected`, plus `ActiveCount`/`AnonymousCount`/`ReservedCount` for the metrics endpoint to read directly (no separate counters to keep in sync). Thread-safe. Unit tests: duplicate registration fails, lookup after unregister returns false, `MarkDisconnected` + reconnect within the grace window cancels removal, counts stay correct under concurrent register/unregister/lookup via `go test -race`.
4. **`internal/sshserver`** — stand up an `ssh.ServerConfig` that accepts anonymous connections only for now (permissive `PublicKeyCallback`/`NoClientAuth` — real key validation comes in step 8/section 4). Handle the `tcpip-forward` global request: generate a short random subdomain (`crypto/rand` → base32, 6-8 chars, e.g. `x7k8m2.tunl.dev`), register it in the `TunnelRegistry`, **retrying generation a small fixed number of times (e.g. 5) on a `Register` collision before giving up** — collisions are rare at this length but the retry is one line and removes a class of intermittent connection failures. Reply success, print the assigned URL back to the SSH client's terminal. Implement `session.go`'s `sshSession` type against the `TunnelConnection` interface.
5. **`internal/sshserver/channel.go`** — implement opening a forwarded channel back to the client when a public request arrives (`Dial(ctx, ...)`), per the `x/crypto/ssh` server-side port forwarding pattern (`channelOpenForwardMsg`). On session close, call `MarkDisconnected` rather than `Unregister` directly.
6. **`internal/httpproxy`** — build this on `net/http` + `httputil.ReverseProxy`, **not** raw TCP splicing. Parse the `Host` header normally, look up the `Tunnel` in the registry, and give the `ReverseProxy` a custom `Transport` whose `DialContext` calls `Tunnel.Conn.Dial(ctx, ...)` instead of a real TCP dial — apply a per-request timeout on that `ctx`. This gets proper HTTP semantics (keep-alive, chunked encoding, header rewriting, per-request logging) for free. Add `internal/httpproxy/websocket.go` as a separate path: detect the `Upgrade: websocket` header before handing off to the reverse proxy, and for those requests `Hijack()` the connection and splice raw bytes over a dialed connection instead.
7. **`internal/tls.go`** — load a single wildcard cert/key pair from disk (env var paths) for `*.tunl.dev`. ACME automation is explicitly out of scope for now.
8. **`internal/controlclient`** — `client.go` with `ValidateKey(ctx, fingerprint)` and `ReportUsage(ctx, ...)` calling the NestJS internal API; `cache.go` wraps `ValidateKey` with a TTL map (TTL from config, default 5 minutes) so `sshserver/auth.go` isn't hitting NestJS on every connection. One package — the cache is an implementation detail, not a separate module.
9. **`internal/health`** — `/health` (liveness), `/ready` (readiness), `/metrics` (Prometheus via `client_golang`, reading `ActiveCount`/`AnonymousCount`/`ReservedCount` from the registry plus connection/byte counters).
10. **Wire `cmd/tunneld/main.go`** — config → logging → registry → sshserver/httpproxy/controlclient/health, in that order. Graceful shutdown on SIGTERM cancels the root `context.Context`, which propagates to in-flight `Dial` calls and control-plane requests.
11. **Manual end-to-end test**: run a local HTTP server on `:3000`, `ssh -R 80:localhost:3000 -p 2222 localhost`, hit the assigned subdomain, confirm response comes through, including a WebSocket echo test if the local app supports it.

### 1.4 What to explicitly defer
- Redis / multi-instance registry (single in-memory map is fine)
- ACME automation
- TCP (non-HTTP) tunnel support — the `TunnelConnection` abstraction leaves room for this later without a registry/httpproxy rewrite, but don't build it now
- Authenticated tier / key validation against real accounts (stub `KeyValidator` to always return anonymous for now — section 4's step 8 wires the real call in behind the cache built here)
- Usage metering to NestJS (log locally for now)
- Per-IP / global anonymous-connection rate limiting (see section 6 — worth doing before any public launch, but not blocking initial development)

---

## 2. Module: NestJS control plane (`/control-plane`)

Don't start this until the Go server's anonymous flow works end-to-end. Build it in this module order:

### 2.1 Module layout

```
/control-plane/src
  /auth            # signup/login, JWT, session
  /users           # user profile
  /ssh-keys        # add/remove/list public keys, fingerprint lookup
  /tunnels         # reserved subdomain requests
  /billing         # Stripe integration (Phase 3, stub for now)
  /usage           # ingest usage events (Phase 3, stub for now)
  /internal        # endpoints only the Go server calls (not user-facing)
    internal.controller.ts   # POST /internal/validate-key, POST /internal/usage
  app.module.ts
  main.ts
```

Standard Nest conventions: each folder is a Nest module with its own `*.module.ts`, `*.controller.ts`, `*.service.ts`, and a `*.entity.ts` or Prisma/TypeORM model. Use whichever ORM you're already comfortable with (TypeORM given your existing stack) — keep entities thin, business logic in services, controllers thin.

### 2.2 Postgres schema (v1)

```sql
-- gen_random_uuid() is built into Postgres 13+ core; on older versions
-- run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first.

CREATE TABLE plans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL UNIQUE,
  max_reserved_subdomains INT NOT NULL DEFAULT 1,
  is_default              BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforces exactly one default plan at a time (partial unique index),
-- so signup can always find "the" default via is_default = true.
CREATE UNIQUE INDEX plans_single_default_idx ON plans (is_default) WHERE is_default = true;

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT,                            -- nullable: OAuth-only accounts are deferred, but the column shape is future-proof
  plan_id       UUID NOT NULL REFERENCES plans(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness on email without an extra extension dependency.
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE ssh_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key  TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,               -- SHA256 fingerprint; UNIQUE already creates an index, no separate CREATE INDEX needed for lookups by fingerprint
  label       TEXT NOT NULL DEFAULT '',           -- user-facing name e.g. "laptop"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign keys are NOT auto-indexed in Postgres (unlike unique constraints) —
-- needed for "list my keys" and for the cascade delete to be efficient.
CREATE INDEX ssh_keys_user_id_idx ON ssh_keys (user_id);

CREATE TABLE tunnels (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subdomain          TEXT NOT NULL UNIQUE CHECK (subdomain ~ '^[a-z0-9-]{3,63}$'),
  status             TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'active', 'inactive')),
  last_connected_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tunnels_user_id_idx ON tunnels (user_id);
```

What changed from a first-pass version of this schema, and why:
- **`users.plan_id`** was missing entirely — `plans.max_reserved_subdomains` had nothing linking a user to a plan, so "check plan limits" (section 2.4) had no plan to check against. Every user now gets a `plan_id`, defaulted at signup via `plans.is_default`.
- **`plans.is_default`** plus the partial unique index gives signup a deterministic way to find the default plan without hardcoding a UUID or name string in application code.
- **`updated_at`** added to `users` and `tunnels` (the two tables whose rows actually get mutated after creation — `ssh_keys` and `plans` rows are effectively immutable once created, so left without one). Have the ORM (TypeORM's `@UpdateDateColumn`) manage it rather than a Postgres trigger, to keep logic in the app layer.
- **`CHECK` constraints** replace the free-text-with-a-comment approach for `tunnels.status` (was just a comment saying "reserved | active | inactive" with nothing enforcing it) and added one for `subdomain` format, since the Go server's generated subdomains and user-chosen ones both need to satisfy the same shape.
- **Explicit indexes on foreign keys** (`ssh_keys.user_id`, `tunnels.user_id`) — Postgres does not automatically index foreign key columns the way it does `UNIQUE` columns, so without these, "list my tunnels" and the cascade delete on user removal both do a sequential scan as the tables grow.
- **Case-insensitive email uniqueness** via a functional index on `lower(email)`, so `Alice@x.com` and `alice@x.com` can't both sign up.
- **`custom_domain` and `custom_domain_allowed` removed** — custom domains are out of the plan for this phase (see section 6).
- **`ssh_keys.label`** changed from nullable to `NOT NULL DEFAULT ''` — a nullable label just pushes a "handle null" check into the dashboard for no benefit.
- Explicitly deferred, not included here: `usage_records`, `subscriptions` (Phase 3 / billing).

### 2.3 Internal API (Go -> Nest contract)

Define this in `/shared/openapi.yaml` so both sides can generate types from it, or just hand-write matching DTOs on each side for v1 given the small surface:

- `POST /internal/validate-key` — body `{ fingerprint: string }` → `{ userId: string, allowedSubdomain: string, plan: string } | 404`
- `POST /internal/usage` — body `{ tunnelId: string, bytesTransferred: number, timestamp: string }` → `204` (stub: just log it for now, no billing logic yet)

Secure this internal API with a shared secret header (`X-Internal-Token`), not user JWTs — the Go server is a trusted service, not an end user.

**Design note on `plan` vs. numeric limits:** `validate-key` returns the plan **slug** (`"free"`, `"pro"`, etc.), not `maxReservedSubdomains` or any other numeric limit. The only place a reservation limit gets enforced is Nest's `POST /tunnels` handler (section 2.4, task 4) — that's where the plan's `max_reserved_subdomains` is checked against the caller's current tunnel count. The Go server has no code path today that needs to make a limit-based decision, so it doesn't get limit data; giving it the slug instead keeps the door open for future plan-based behavior in Go (e.g. per-tier idle timeouts) without duplicating enforcement logic in two languages. This response is also cached for up to `cacheTTL` (controlclient/cache.go) — fine for a subdomain or a plan slug that changes rarely, but a reason never to route real-time limit enforcement through this endpoint.

### 2.4 Task breakdown

1. **Auth module** — email/password signup + login, JWT issuance, standard Nest guard setup. Signup assigns `plan_id` by looking up the plan where `is_default = true`. Tests: signup creates user with the default plan, login returns valid JWT, protected route rejects missing/invalid token.
2. **Users module** — `GET /me` returns profile including plan name and `max_reserved_subdomains`.
3. **SSH keys module** — `POST /ssh-keys` (validate it's a well-formed public key, compute fingerprint server-side, store), `GET /ssh-keys`, `DELETE /ssh-keys/:id`. Tests: duplicate fingerprint rejected, malformed key rejected, fingerprint computed correctly against a known test vector.
4. **Tunnels module** — `POST /tunnels` (reserve a subdomain, check the caller's plan's `max_reserved_subdomains` against their current tunnel count before inserting), `GET /tunnels`, `DELETE /tunnels/:id`.
5. **Internal module** — the two endpoints above, guarded by shared-secret header, calling into `ssh-keys` and `usage` services.
6. **Wire config** — `.env` for DB connection, JWT secret, internal shared secret, seed migration that inserts the one default plan row.

### 2.5 What to explicitly defer
- Billing module — build the folder and a no-op service now so the shape exists, implement Stripe in Phase 3
- Usage aggregation/dashboards — log-only for now
- Admin module
- OAuth providers — email/password is enough for v1

---

## 3. Module: Next.js dashboard (`/dashboard`)

Build last, once both backends have working endpoints to hit.

### 3.1 Page layout (App Router)

```
/dashboard/app
  /(marketing)/page.tsx        # landing page
  /login/page.tsx
  /signup/page.tsx
  /dashboard
    /page.tsx                   # list tunnels + reserve new subdomain
    /keys/page.tsx               # add/remove SSH public keys
  /layout.tsx
/lib
  api-client.ts                  # typed fetch wrapper against control-plane API
```

### 3.2 Task breakdown
1. Auth pages calling the NestJS `auth` module, storing JWT (httpOnly cookie via a Next.js route handler, not localStorage).
2. Dashboard page: list reserved tunnels, form to reserve a new subdomain, show the exact `ssh -R ...` command the user should run (this is the key "aha" moment of the product — make it copy-pasteable and correct).
3. Keys page: paste a public key, label it, list existing keys with fingerprints, delete.
4. No live traffic/status view yet — that needs the usage/websocket pipeline from Phase 3+.

---

## 4. Suggested build order for the agent

Work through these as separate sessions/PRs, each with its own tests passing before moving on:

1. Go: `config` — env-based config struct, load first
2. Go: `logging` — `log/slog` setup with standard fields, initialized right after config
3. Go: `registry` package + tests (`ActiveCount`/`AnonymousCount`/`ReservedCount`, grace-window behavior)
4. Go: `sshserver` anonymous-only flow, manual end-to-end test with a local `ssh` client
5. Go: `httpproxy` — `net/http` + `httputil.ReverseProxy` with the SSH-backed `DialContext`, plus the WebSocket hijack path, manual end-to-end test through to a real HTTP response
6. Go: `controlclient` (with built-in cache) — stub `KeyValidator` to always return anonymous for now
7. Go: `health` — `/health`, `/ready`, `/metrics` reading from the registry
8. Go: `cmd/tunneld/main.go` — wire config → logging → registry → sshserver/httpproxy/controlclient/health, graceful shutdown
9. Nest: `auth` + `users` modules + tests (including default-plan assignment)
10. Nest: `ssh-keys` module + tests
11. Nest: `tunnels` module + tests (including plan-limit enforcement)
12. Nest: `internal` endpoints + shared-secret guard
13. Go: wire `controlclient.ValidateKey` to actually call `POST /internal/validate-key` instead of the anonymous stub; gate reserved subdomains behind a real lookup
14. Dashboard: auth pages
15. Dashboard: keys page
16. Dashboard: tunnels page showing the ssh command
17. End-to-end manual test: create account in dashboard → add SSH key → reserve subdomain → `ssh -R` using that key → confirm request routes correctly to local app

## 5. Testing conventions to hand the agent
- Go: table-driven tests, `go test -race` for anything touching the registry or shared connection state, no live network calls in unit tests — fake the `TunnelConnection` interface
- Nest: standard `@nestjs/testing` module tests per service, mock the repository layer, at least one e2e test per module hitting a real test Postgres (via `docker-compose` test profile or testcontainers)
- Dashboard: skip heavy test infra for v1, rely on manual QA — add Playwright later if it becomes worth it

## 6. Explicitly out of scope for this phase
Multi-instance scaling, Redis-backed session registry, ACME automation, TCP (non-HTTP) tunnels, **custom domains** (considered during planning — a custom domain can't be covered by the single `*.tunl.dev` wildcard cert, and per-domain cert issuance is real work; dropped for this phase entirely, not just deferred to a later task), Stripe billing logic, usage-based metering/limits enforcement, request/traffic inspector UI, team accounts, admin tooling, per-IP/global anonymous-connection abuse limits (recommended before public launch, but not required to start building).