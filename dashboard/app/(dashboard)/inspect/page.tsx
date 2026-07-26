"use client";

import { Button } from "@/components/ui/button";
import { useTunnelSessionsQuery, useTunnelsQuery } from "@/hooks/use-tunnels";
import {
  Activity,
  ArrowUpRight,
  Check,
  Copy,
  Radio,
  Search,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function InspectLandingPage() {
  const { data: tunnels = [] } = useTunnelsQuery();
  const { data: sessions = [] } = useTunnelSessionsQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const activeSubdomains = useMemo(() => sessions.map((s) => s.subdomain), [sessions]);

  const allSubdomains = useMemo(() => {
    const set = new Set([...sessions.map((s) => s.subdomain), ...tunnels.map((t) => t.subdomain)]);
    return Array.from(set);
  }, [sessions, tunnels]);

  const filteredSubdomains = useMemo(() => {
    if (!searchQuery.trim()) return allSubdomains;
    const q = searchQuery.toLowerCase();
    return allSubdomains.filter((subdomain) => subdomain.toLowerCase().includes(q));
  }, [allSubdomains, searchQuery]);

  const copyUrl = (e: React.MouseEvent, subdomain: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`https://${subdomain}.tunl.online`);
    setCopiedDomain(subdomain);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Top Header */}
      <div className="border-border/60 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-left">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-bold tracking-tight">Request Inspector</h1>
            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              Live Capture
            </span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Inspect real-time HTTP requests, response payloads, headers, and cURL commands for your
            tunnel endpoints.
          </p>
        </div>

        {/* Search & Stats Bar */}
        <div className="flex items-center gap-3">
          <div className="border-border/60 bg-muted/20 flex items-center gap-3 rounded-lg border px-3 py-1.5 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                <strong className="text-foreground">{activeSubdomains.length}</strong> Live
              </span>
            </div>
            <span className="bg-border/60 h-3 w-px" />
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span>30m Retention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Control */}
      {allSubdomains.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter endpoint subdomain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border/60 bg-background placeholder:text-muted-foreground/60 focus:ring-primary w-full rounded-md border py-1.5 pr-3 pl-9 text-xs focus:ring-1 focus:outline-none"
            />
          </div>
          <span className="text-muted-foreground text-xs">
            Showing {filteredSubdomains.length} of {allSubdomains.length} endpoint
            {allSubdomains.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Grid of Subdomains */}
      {allSubdomains.length === 0 ? (
        <div className="border-border/60 bg-card flex flex-col items-center justify-center gap-4 rounded-lg border py-16 text-center shadow-2xs">
          <div className="border-border/60 bg-muted/40 flex h-12 w-12 items-center justify-center rounded-xl border">
            <WifiOff className="text-muted-foreground/40 h-6 w-6" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-foreground text-sm font-semibold">No active endpoints found</h3>
            <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
              Reserve a subdomain or establish an SSH tunnel session to begin inspecting HTTP
              traffic and payloads.
            </p>
          </div>
          <Link href="/dashboard">
            <Button size="sm" className="text-xs font-semibold">
              Create Tunnel
            </Button>
          </Link>
        </div>
      ) : filteredSubdomains.length === 0 ? (
        <div className="border-border/60 bg-card flex flex-col items-center justify-center gap-2 rounded-lg border py-12 text-center shadow-2xs">
          <p className="text-muted-foreground text-xs">
            No subdomains match &quot;<strong className="text-foreground">{searchQuery}</strong>
            &quot;
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setSearchQuery("")}
            className="text-primary text-xs"
          >
            Clear Filter
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubdomains.map((subdomain) => {
            const isActive = activeSubdomains.includes(subdomain);
            return (
              <Link
                key={subdomain}
                href={`/inspect/${subdomain}`}
                className="border-border/60 bg-card hover:border-border/80 hover:bg-muted/20 group relative flex flex-col justify-between gap-4 rounded-xl border p-5 shadow-2xs transition-all"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-primary text-xs font-semibold">&gt;_</span>
                      <h3 className="text-foreground group-hover:text-primary font-mono text-sm font-bold tracking-tight transition-colors">
                        {subdomain}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                        isActive
                          ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                          : "bg-muted text-muted-foreground border-border/60"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                          Live
                        </>
                      ) : (
                        <>
                          <span className="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full" />
                          Offline
                        </>
                      )}
                    </span>
                  </div>

                  <div className="border-border/40 bg-muted/40 flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-muted-foreground truncate font-mono text-xs">
                      https://{subdomain}.tunl.online
                    </span>
                    <button
                      type="button"
                      onClick={(e) => copyUrl(e, subdomain)}
                      className="text-muted-foreground hover:text-foreground ml-2 shrink-0 transition-colors"
                      title="Copy Public URL"
                    >
                      {copiedDomain === subdomain ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-border/60 flex items-center justify-between border-t pt-3 font-sans text-xs">
                  <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>HTTPS Proxy</span>
                  </div>
                  <span className="text-foreground group-hover:text-primary inline-flex items-center gap-1 font-semibold transition-colors">
                    Inspect Traffic <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
