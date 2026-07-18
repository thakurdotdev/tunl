# Architecture

Three independently-runnable services, one Postgres database:

- **`tunnel-server`** (Go) — accepts `ssh -R` connections on `:2222`, assigns
  subdomains, and proxies public HTTP(S) traffic on `:8080`/`:8443` back
  through the SSH connection to the user's local app. No persistent state of
  its own beyond an in-memory registry; calls the control plane's internal
  API to validate SSH keys and report usage.
- **`control-plane`** (Express + Drizzle) — owns Postgres: users, plans, SSH keys,
  reserved subdomains. It uses Redis for distributed authentication rate limits;
  every Redis key is namespaced under `tunl:control-plane:`. Exposes a user-facing REST API (auth, keys, tunnels)
  and a separate shared-secret-guarded internal API that only `tunnel-server`
  calls.
- **`dashboard`** (Next.js) — talks only to `control-plane`'s public API.
  Never talks to `tunnel-server` directly.

```
 SSH client            HTTP client (browser)
     |                        |
     v                        v
+----------------+   +--------------------+
|  tunnel-server |   |   public HTTPS      |
|   :2222 (ssh)  |   |  *.thakur.dev :8443   |
+----------------+   +--------------------+
        |                     |
        | POST /internal/*    | (same registry lookup)
        v                     |
+-----------------------------------------+
|          control-plane :3001            |
|   /auth /users /ssh-keys /tunnels        |
|   /internal/validate-key /internal/usage |
+-----------------------------------------+
        |
        v
   Postgres (users, plans, ssh_keys, tunnels)

+--------------------+
|   dashboard :3000   |  --> control-plane public API only
+--------------------+
```

See the root implementation plan for the full module breakdown, task order,
and design rationale behind each interface.
