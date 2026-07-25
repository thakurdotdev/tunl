export function Features() {
  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <h2 className="text-foreground mb-10 text-xl font-bold tracking-tight sm:text-2xl">
          Capabilities
        </h2>

        <div className="grid gap-12 md:grid-cols-2 md:gap-10">
          {/* Tunnel Infrastructure */}
          <div>
            <h3 className="text-muted-foreground mb-5 font-mono text-[11px] font-medium tracking-wider uppercase">
              Tunnel Infrastructure
            </h3>
            <dl className="flex flex-col gap-4.5">
              <div>
                <dt className="text-foreground text-sm font-semibold">Automatic HTTPS & TLS</dt>
                <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Automatic TLS termination on public endpoints. Every tunnel receives an{" "}
                  <code className="text-foreground font-mono">HTTPS</code> domain with valid SSL
                  certificates.
                </dd>
              </div>
              <div>
                <dt className="text-foreground text-sm font-semibold">
                  WebSocket & SSE Protocol Upgrade
                </dt>
                <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Full <code className="text-foreground font-mono">HTTP/1.1</code> connection
                  upgrade support for WebSockets, Server-Sent Events, and Vite/Next.js Hot Module
                  Replacement.
                </dd>
              </div>
              <div>
                <dt className="text-foreground text-sm font-semibold">
                  Request Telemetry & Inspection
                </dt>
                <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Inspect incoming HTTP headers, payloads, methods, and status codes in real time
                  from the tunl dashboard.
                </dd>
              </div>
              <div>
                <dt className="text-foreground text-sm font-semibold">Persistent Subdomains</dt>
                <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Reserve fixed subdomain aliases (e.g.{" "}
                  <code className="text-foreground font-mono">my-app.tunl.online</code>) linked
                  directly to your SSH public key.
                </dd>
              </div>
            </dl>
          </div>

          {/* Security & Access Control */}
          <div>
            <h3 className="text-muted-foreground mb-5 font-mono text-[11px] font-medium tracking-wider uppercase">
              Security & Access Control
            </h3>
            <dl className="flex flex-col gap-4.5">
              <div>
                <dt className="text-foreground text-sm font-semibold">
                  OpenSSH Key Authentication
                </dt>
                <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Authenticate using standard{" "}
                  <code className="text-foreground font-mono">Ed25519</code> or{" "}
                  <code className="text-foreground font-mono">RSA</code> public key cryptography.
                  Zero API tokens or static passwords required.
                </dd>
              </div>
              <div>
                <dt className="text-foreground text-sm font-semibold">IP Address Allowlisting</dt>
                <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Restrict access to active tunnel endpoints by specifying authorized CIDR blocks or
                  client IP ranges in your dashboard settings.
                </dd>
              </div>
              <div>
                <dt className="text-foreground text-sm font-semibold">Scoped Port Forwarding</dt>
                <dd className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                  Forwarding is strictly scoped to the designated local TCP port (e.g.{" "}
                  <code className="text-foreground font-mono">3000</code>). No local file system or
                  network access is exposed.
                </dd>
              </div>
              <div>
                <dt className="text-foreground text-sm font-semibold">
                  Key Revocation & Management
                </dt>
                <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  Register, verify fingerprints, and revoke authorized SSH keys instantly from the
                  web console.
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Quiet Roadmap Line */}
        <div className="border-border/40 mt-10 flex flex-col justify-between gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center">
          <span className="text-muted-foreground font-mono text-[11px] font-medium tracking-wider uppercase">
            In development
          </span>
          <span className="text-muted-foreground text-xs">
            Custom domain support (
            <code className="text-foreground font-mono">.yourdomain.com</code>) · TCP port
            forwarding · Team workspaces
          </span>
        </div>
      </div>
    </section>
  );
}
