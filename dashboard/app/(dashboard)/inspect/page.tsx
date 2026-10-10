"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTunnelSessionsQuery, useTunnelsQuery } from "@/hooks/use-tunnels";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  Globe,
  Radio,
  Search,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function InspectLandingPage() {
  const { data: tunnels = [] } = useTunnelsQuery();
  const { data: sessions = [] } = useTunnelSessionsQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const activeSubdomains = useMemo(() => sessions.map((session) => session.subdomain), [sessions]);
  const allSubdomains = useMemo(() => {
    const subdomains = new Set([
      ...sessions.map((session) => session.subdomain),
      ...tunnels.map((tunnel) => tunnel.subdomain),
    ]);
    return Array.from(subdomains);
  }, [sessions, tunnels]);

  const filteredSubdomains = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allSubdomains;
    return allSubdomains.filter((subdomain) => subdomain.toLowerCase().includes(query));
  }, [allSubdomains, searchQuery]);

  const copyUrl = async (subdomain: string) => {
    await navigator.clipboard.writeText(`https://${subdomain}.tunl.online`);
    setCopiedDomain(subdomain);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Request inspector
          </h1>
        </div>

        <Card size="sm" className="flex-row items-center gap-0 self-start p-0 sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <Radio className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold tabular-nums">{activeSubdomains.length}</span>
            <span className="text-muted-foreground">live</span>
          </div>
          <div className="h-5 w-px bg-border/60" />
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>30m retention</span>
          </div>
        </Card>
      </div>

      {allSubdomains.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Filter endpoints"
              placeholder="Filter endpoints..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredSubdomains.length}</span> of {allSubdomains.length} endpoint
            {allSubdomains.length === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {allSubdomains.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
              <WifiOff className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <h2 className="text-base font-semibold">No endpoints to inspect</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Reserve a subdomain or connect an SSH tunnel. Its requests will appear here while it is active.
            </p>
            <Button nativeButton={false} render={<Link href="/dashboard" />} size="sm" className="mt-5">
              <Globe className="h-4 w-4" /> Go to tunnels
            </Button>
          </CardContent>
        </Card>
      ) : filteredSubdomains.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <Search className="mb-3 h-6 w-6 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No endpoints match <span className="font-medium text-foreground">“{searchQuery}”</span>.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-2">
              Clear filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 p-0 shadow-none">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Your endpoints</h2>
            </div>
            <Badge variant="secondary">{filteredSubdomains.length}</Badge>
          </div>
          <div className="divide-y divide-border/60">
            {filteredSubdomains.map((subdomain) => {
              const session = sessions.find((item) => item.subdomain === subdomain);
              const isActive = Boolean(session);
              const tunnel = tunnels.find((item) => item.subdomain === subdomain);
              const connectionSummary = session
                ? `Connected ${formatDistanceToNow(new Date(session.connectedAt), { addSuffix: true })}`
                : tunnel?.lastConnectedAt
                  ? `Last connected ${formatDistanceToNow(new Date(tunnel.lastConnectedAt), { addSuffix: true })}`
                  : "Never connected";
              const url = `https://${subdomain}.tunl.online`;

              return (
                <div
                  key={subdomain}
                  className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-mono text-sm font-semibold text-foreground">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                            {subdomain}.tunl.online
                          </a>
                        </h3>
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : ""}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/50"}`} />
                          {isActive ? "Live" : "Reserved"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{connectionSummary}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={`Copy ${subdomain} URL`}
                      title="Copy public URL"
                      onClick={() => void copyUrl(subdomain)}
                    >
                      {copiedDomain === subdomain ? <Check className="text-emerald-400" /> : <Copy />}
                    </Button>
                    <Button
                      nativeButton={false}
                      render={<Link href={`/inspect/${subdomain}/analytics`} />}
                      size="sm"
                      variant="outline"
                    >
                      <BarChart3 className="h-3.5 w-3.5" /> Analytics
                    </Button>
                    <Button nativeButton={false} render={<Link href={`/inspect/${subdomain}`} />} size="sm">
                      Inspect <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
