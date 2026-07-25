"use client";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <h2 className="text-foreground mb-3 text-xl font-bold tracking-tight sm:text-2xl">
          How it works
        </h2>
        <p className="text-muted-foreground mb-10 max-w-lg text-sm leading-relaxed">
          tunl uses standard SSH remote port forwarding. Your local server connects to tunl over an
          SSH session, and tunl routes public HTTPS traffic back through that connection.
        </p>

        {/* Desktop Architecture Grid */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-0">
            <div className="pr-8">
              <span className="text-muted-foreground mb-2.5 block font-mono text-[11px] font-medium tracking-wider uppercase">
                1. Local Machine
              </span>
              <code className="text-foreground mb-2 block font-mono text-sm font-semibold">
                localhost:3000
              </code>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Any HTTP server — Next.js, FastAPI, Express, or Django. Running on any local TCP
                port.
              </p>
            </div>

            <div className="border-border/40 border-x border-dashed px-8">
              <span className="text-muted-foreground mb-2.5 block font-mono text-[11px] font-medium tracking-wider uppercase">
                2. SSH Transport
              </span>
              <code className="text-foreground mb-2 block font-mono text-sm font-semibold">
                tunl.online:2222
              </code>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Standard OpenSSH reverse port forward (
                <code className="text-foreground font-mono">ssh -R</code>). Encrypted end-to-end
                with Ed25519 key pairs.
              </p>
            </div>

            <div className="pl-8">
              <span className="text-muted-foreground mb-2.5 block font-mono text-[11px] font-medium tracking-wider uppercase">
                3. Public Endpoint
              </span>
              <code className="text-primary mb-2 block font-mono text-sm font-semibold">
                https://my-app.tunl.online
              </code>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Public HTTPS endpoint with TLS certificates. Accessible globally for webhooks,
                teammates, and mobile testing.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Vertical Flow */}
        <div className="flex flex-col gap-0 text-xs md:hidden">
          <div className="py-3">
            <span className="text-muted-foreground mb-1.5 block font-mono text-[10px] font-medium tracking-wider uppercase">
              1. Local Machine
            </span>
            <code className="text-foreground mb-1 block font-mono text-sm font-semibold">
              localhost:3000
            </code>
            <p className="text-muted-foreground leading-relaxed">
              Any HTTP server running on any local port.
            </p>
          </div>

          <div className="border-border/40 flex items-center gap-2 py-1.5">
            <div className="border-border/40 flex-1 border-t border-dashed" />
            <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-wider uppercase">
              SSH -R 80
            </span>
            <div className="border-border/40 flex-1 border-t border-dashed" />
          </div>

          <div className="py-3">
            <span className="text-muted-foreground mb-1.5 block font-mono text-[10px] font-medium tracking-wider uppercase">
              2. SSH Transport
            </span>
            <code className="text-foreground mb-1 block font-mono text-sm font-semibold">
              tunl.online:2222
            </code>
            <p className="text-muted-foreground leading-relaxed">
              Standard OpenSSH. Encrypted transport layer.
            </p>
          </div>

          <div className="border-border/40 flex items-center gap-2 py-1.5">
            <div className="border-border/40 flex-1 border-t border-dashed" />
            <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-wider uppercase">
              HTTPS TLS
            </span>
            <div className="border-border/40 flex-1 border-t border-dashed" />
          </div>

          <div className="py-3">
            <span className="text-muted-foreground mb-1.5 block font-mono text-[10px] font-medium tracking-wider uppercase">
              3. Public Endpoint
            </span>
            <code className="text-primary mb-1 block font-mono text-sm font-semibold">
              https://my-app.tunl.online
            </code>
            <p className="text-muted-foreground leading-relaxed">
              Public HTTPS endpoint with TLS. Accessible anywhere.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
