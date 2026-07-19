# Tunl Implementation Status & Audit

**Last Updated:** 2026-07-19

---

## Build Order Checklist (Section 4 of Plan)

| #   | Task                                   | Status     | Notes                                                                                            |
| --- | -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 1   | Go: `config`                           | ✅ Done    | Env-based config, `.env` loader, required `INTERNAL_SHARED_SECRET`                               |
| 2   | Go: `logging`                          | ✅ Done    | `slog` JSON handler, standard field constants                                                    |
| 3   | Go: `registry` + tests                 | ✅ Done    | Thread-safe map, grace window, race tests, `Reclaim`, `IsDisconnected`                           |
| 4   | Go: `sshserver` anonymous flow         | ✅ Done    | Port forwarding, random subdomain, session channel URL display                                   |
| 5   | Go: `httpproxy` reverse proxy          | ✅ Done    | `ReverseProxy` with SSH DialContext, WebSocket hijack splice, 503 for disconnected               |
| 6   | Go: `controlclient` with TTL cache     | ✅ Done    | HTTP client + in-memory TTL cache                                                                |
| 7   | Go: `health` endpoints                 | ✅ Done    | `/health`, `/ready`, `/metrics` (Prometheus gauges)                                              |
| 8   | Go: `cmd/tunneld/main.go` wiring       | ✅ Done    | Config → logging → registry → servers, graceful SIGTERM                                          |
| 9   | Express: DB schema + migrations + seed | ✅ Done    | 4 Drizzle migrations, default plan seed                                                          |
| 10  | Express: `auth` + `users` routes       | ✅ Done    | Argon2id, JWT, email verification, password reset, rate limiting                                 |
| 11  | Express: `ssh-keys` + `tunnels` routes | ✅ Done    | SSH key parsing + fingerprint, subdomain reservation with plan limits                            |
| 12  | Express: `internal` router             | ✅ Done    | `validate-key` + `usage`, `timingSafeEqual` on shared secret                                     |
| 13  | Go: Wire `controlclient` → `sshserver` | ✅ Done    | `keyValidatorAdapter` bridges context gap, `PublicKeyCallback` wired, reserved subdomain routing |
| 14  | Dashboard: Auth pages                  | ✅ Done    | Login, signup, verify-email, forgot/reset-password                                               |
| 15  | Dashboard: SSH Keys page               | ✅ Done    | Add key modal, list keys, delete confirmation                                                    |
| 16  | Dashboard: Tunnels page                | ✅ Done    | Reserve subdomain modal, list tunnels with SSH command display                                   |
| 17  | End-to-end manual test                 | ⬜ Pending | Full integration test across Dashboard → Control Plane → Tunnel Server                           |

---

## Security & Reliability Audit

### ✅ Resolved Issues

#### SSH Hardening (P0)

- **`NoClientAuth` set to `false`** — every connection goes through `PublicKeyCallback`. Known keys get `ssh.Permissions` with user info; unknown keys accepted as anonymous.
- **One `tcpip-forward` per session** — `markForwarded()` rejects duplicate forward requests.
- **`controlclient` wired as `KeyValidator`** — `keyValidatorAdapter` bridges `context.Context` gap. Authenticated users get their reserved subdomain; anonymous users get random base32.
- **Reserved subdomain reconnect** — `registry.Reclaim()` replaces a dead connection during the grace window.

#### SSH Session Safety (P1)

- **Mutex on `sshSession` fields** — `subdomain`, `bindAddr`, `bindPort`, `tunnelURL`, `forwarded` all guarded by `sync.Mutex` with getter/setter methods.
- **Channel request hardening** — `pty-req`, `shell`, `window-change` approved; `exec`, `subsystem`, and everything else rejected.

#### HTTP Proxy (P1)

- **503 for disconnected tunnels** — `registry.IsDisconnected()` checked after `Lookup`; returns `503 Service Unavailable` during grace window instead of attempting to dial a dead connection.

#### Rate Limiting (P1)

- **Per-IP SSH connection limiter** — `connLimiter` rejects connections exceeding `MAX_CONNS_PER_IP` (default 10) before the SSH handshake.

#### Control Plane (P1)

- **CORS locked to dashboard origin** — changed `origin: "*"` → `origin: config.DASHBOARD_URL`.

### ✅ Already Done Well

| Area                  | Implementation                                                      |
| --------------------- | ------------------------------------------------------------------- |
| Password hashing      | Argon2id with OWASP params (`memoryCost: 19456, timeCost: 2`)       |
| JWT                   | `jose` HS256, issuer/audience validation, 1h expiry                 |
| Token storage         | SHA-256 hashed, single-use, time-expiry                             |
| Rate limiting         | Redis-backed per-IP on all auth routes                              |
| Internal API auth     | `timingSafeEqual` on shared secret                                  |
| SSH key parsing       | Server-side via `ssh2.utils.parseKey`, rejects private keys         |
| SQL injection         | Drizzle ORM parameterized queries                                   |
| Input validation      | Zod schemas on every route, `express.json({ limit: "16kb" })`       |
| Error responses       | `{ error: { code, message, requestId } }` envelope, no stack traces |
| Subdomain reservation | Transactional plan-limit check with `FOR UPDATE` row lock           |
| Helmet                | Security headers via `helmet()` middleware                          |

---

## Remaining Work (P2 / Low Priority)

| Item                                        | Effort | Notes                                              |
| ------------------------------------------- | ------ | -------------------------------------------------- |
| Fix signup timing side-channel              | Small  | Always hash even for existing users                |
| Add idle timeout to WebSocket splice        | Small  | Prevent infinite-lived idle connections            |
| Reuse `ReverseProxy`/`Transport` per tunnel | Medium | Currently allocated per-request                    |
| Marketing landing page                      | Medium | `app/page.tsx` currently redirects to `/dashboard` |
| Gate `/ready` on control plane health       | Small  | Currently always returns 200                       |
| Add connection/byte counters to Prometheus  | Small  | TODO in `health.go`                                |
| TTL cache eviction of stale entries         | Small  | Expired entries only evicted on `get()`            |
| End-to-end integration test (Step 17)       | Medium | Manual full-stack validation                       |
