# tunnel-saas

Reverse SSH tunnel SaaS — `ssh -R 80:localhost:3000 sub@thakur.dev`, no client
binary. This is a scaffolded skeleton: directory structure, interfaces,
config, DB schema/migration, and Docker wiring are in place; business logic
is stubbed with `TODO`s tagged to the plan's section/step numbers. Build
order and rationale live in the original implementation plan — read that
alongside this repo, don't treat this README as a replacement for it.

## Layout

```
/tunnel-server   Go — SSH server + HTTP(S) reverse proxy (the tunnel core)
/control-plane   NestJS + Postgres — accounts, SSH keys, reserved subdomains
/dashboard       Next.js — signup/login, manage keys and tunnels
/shared          openapi.yaml (Go<->Nest contract), docker-compose.yml
/docs            architecture.md
```

## Local dev

```bash
cd shared
docker compose up postgres redis   # bring up just the DB first

# tunnel-server
cd ../tunnel-server
cp .env.example .env               # set INTERNAL_SHARED_SECRET to match control-plane's
go mod tidy
go test -race ./...
go run ./cmd/tunneld

# control-plane (separate shell)
cd ../control-plane
cp .env.example .env
npm install
npm run migration:run              # or: psql < migrations/001_init.sql
npm run start:dev

# dashboard (separate shell)
cd ../dashboard
cp .env.example .env
npm install
npm run dev
```

Or `docker compose up` from `/shared` to bring up everything at once.

## Build order (matches the plan's suggested agent build order)

1. Go `config` → `logging` → `registry` (+ tests) → `sshserver`
   (anonymous-only) → `httpproxy` → `controlclient` (stub validator) →
   `health` → wire `cmd/tunneld/main.go`
2. Nest `auth` + `users` → `ssh-keys` → `tunnels` → `internal` endpoints
3. Go: wire `controlclient.ValidateKey` to the real `/internal/validate-key`
   call, replacing the anonymous-only stub
4. Dashboard: auth pages → keys page → tunnels page
5. End-to-end manual test: dashboard signup → add key → reserve subdomain →
   `ssh -R` using that key → confirm routing

## What's stubbed vs. what's real here

**Real / working:**
- `tunnel-server/internal/registry` — full implementation + passing unit
  tests (`go test -race ./...`), including the reconnect grace window
- Postgres schema (`control-plane/migrations/001_init.sql`) matches the plan
  exactly, including all the constraints/indexes called out in its design
  notes
- NestJS `auth`, `users`, `ssh-keys`, `tunnels`, `internal` modules have real
  service logic (signup/login, plan-limit enforcement, shared-secret guard)
  and starter unit tests
- `docker-compose.yml`, both `Dockerfile`s, `openapi.yaml`

**Stubbed — needs real implementation (search for `TODO` comments):**
- `tunnel-server/internal/sshserver` — the actual `tcpip-forward` /
  `forwarded-tcpip` channel handling (plan steps 4–5) is the hardest part of
  this whole project and is left as scaffolding + design-note comments, not
  working code
- `httpproxy`'s `io.ReadWriteCloser` → `net.Conn` adapter is a rough
  best-effort wrapper — revisit once real SSH channels are flowing through it
- `ssh-keys.service.ts`'s fingerprint computation is a placeholder hash, not
  real OpenSSH key parsing — flagged inline
- Dashboard pages render forms but don't yet wire up the httpOnly-cookie
  session flow (route handler not created yet)
- Everything under "explicitly deferred" in the plan (Redis, ACME, TCP
  tunnels, billing, rate limiting) — folders exist where called for, no logic

## Testing

- Go: `go test -race ./...` (registry has real tests today; add more as
  other packages get filled in)
- Nest: `npm test` for unit specs, `npm run test:e2e` against a running test
  Postgres
- Dashboard: manual QA for v1, per the plan
