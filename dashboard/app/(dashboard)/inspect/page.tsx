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
      <div className="border-border/60 flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Request inspector
          </h1>
        </div>

        <Card size="sm" className="flex-row items-center gap-0 self-start p-0 sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <Radio className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold tabular-nums">{activeSubdomains.length}</span>
            <span className="text-muted-foreground">live</span>
          </div>
          <div className="bg-border/60 h-5 w-px" />
          <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
            <Activity className="h-4 w-4" />
            <span>30m retention</span>
          </div>
        </Card>
      </div>

      {allSubdomains.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="search"
              aria-label="Filter endpoints"
              placeholder="Filter endpoints..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Showing <span className="text-foreground font-medium">{filteredSubdomains.length}</span>{" "}
            of {allSubdomains.length} endpoint
            {allSubdomains.length === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {allSubdomains.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="border-border/60 bg-muted/40 mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
              <WifiOff className="text-muted-foreground/60 h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">No endpoints to inspect</h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Reserve a subdomain or connect an SSH tunnel. Its requests will appear here while it
              is active.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/dashboard" />}
              size="sm"
              className="mt-5"
            >
              <Globe className="h-4 w-4" /> Go to tunnels
            </Button>
          </CardContent>
        </Card>
      ) : filteredSubdomains.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <Search className="text-muted-foreground/60 mb-3 h-6 w-6" />
            <p className="text-muted-foreground text-sm">
              No endpoints match{" "}
              <span className="text-foreground font-medium">“{searchQuery}”</span>.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-2">
              Clear filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 p-0 shadow-none">
          <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Your endpoints</h2>
            </div>
            <Badge variant="secondary">{filteredSubdomains.length}</Badge>
          </div>
          <div className="divide-border/60 divide-y">
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
                  className="hover:bg-muted/20 flex flex-col gap-4 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="border-primary/20 bg-primary/10 text-primary mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-foreground font-mono text-sm font-semibold">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            {subdomain}.tunl.online
                          </a>
                        </h3>
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={
                            isActive
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : ""
                          }
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${isActive ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/50"}`}
                          />
                          {isActive ? "Live" : "Reserved"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">{connectionSummary}</p>
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
                      {copiedDomain === subdomain ? (
                        <Check className="text-emerald-400" />
                      ) : (
                        <Copy />
                      )}
                    </Button>
                    <Button
                      nativeButton={false}
                      render={<Link href={`/inspect/${subdomain}/analytics`} />}
                      size="sm"
                      variant="outline"
                    >
                      <BarChart3 className="h-3.5 w-3.5" /> Analytics
                    </Button>
                    <Button
                      nativeButton={false}
                      render={<Link href={`/inspect/${subdomain}`} />}
                      size="sm"
                    >
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
