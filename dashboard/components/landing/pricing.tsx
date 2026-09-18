import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export function Pricing() {
  return (
    <section id="pricing" className="py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <h2 className="text-foreground mb-3 text-xl font-bold tracking-tight sm:text-2xl">
          Pricing
        </h2>
        <p className="text-muted-foreground mb-8 max-w-lg text-sm leading-relaxed">
          Start tunneling immediately without an account. Register an SSH key to reserve persistent
          subdomains.
        </p>

        {/* Unified Two-Plan Container */}
        <div className="border-border/60 bg-card divide-border/60 grid divide-y overflow-hidden rounded-lg border md:grid-cols-2 md:divide-x md:divide-y-0">
          {/* Ephemeral Tier */}
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-7">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-mono text-[11px] font-semibold tracking-wider uppercase">
                  Ephemeral Tier
                </span>
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-[10px] font-medium">
                  Free Forever
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-foreground font-mono text-2xl font-bold">$0</span>
                <span className="text-muted-foreground text-xs">/ month</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Instant 1-command tunneling for quick debugging, testing, and webhook inspection.
              </p>
              <ul className="border-border/40 flex flex-col gap-2 border-t pt-4 text-xs">
                <li className="text-foreground flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  Random subdomain per SSH connection
                </li>
                <li className="text-foreground flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  Automatic HTTPS & TLS termination
                </li>
                <li className="text-foreground flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  WebSocket & SSE protocol upgrades
                </li>
                <li className="text-foreground flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  No account or registration required
                </li>
              </ul>
            </div>
            <Link href="/dashboard" className="pt-2">
              <Button variant="outline" className="w-full text-xs font-medium">
                Start Free Tunnel
              </Button>
            </Link>
          </div>

          {/* Reserved Tier */}
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-7">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-mono text-[11px] font-semibold tracking-wider uppercase">
                  Reserved Tier
                </span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                  Developer Preview
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-foreground font-mono text-2xl font-bold">$0</span>
                <span className="text-muted-foreground text-xs">/ preview access</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Persistent custom subdomains linked directly to your registered OpenSSH public key.
              </p>
              <ul className="border-border/40 flex flex-col gap-2 border-t pt-4 text-xs">
                <li className="text-foreground flex items-center gap-2 font-medium">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  Everything included in Ephemeral
                </li>
                <li className="text-foreground flex items-center gap-2 font-medium">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  Persistent static subdomain (
                  <code className="font-mono text-xs">name.tunl.online</code>)
                </li>
                <li className="text-foreground flex items-center gap-2 font-medium">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  OpenSSH Ed25519 key authentication
                </li>
                <li className="text-foreground flex items-center gap-2 font-medium">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  Traffic inspector & web dashboard
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/login">
                <Button className="w-full gap-1.5 text-xs font-semibold">
                  Claim Reserved Subdomain <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
