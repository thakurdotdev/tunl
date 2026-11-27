"use client";

import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTunnelSessionsQuery, useTunnelsQuery } from "@/hooks/use-tunnels";
import { inspectAnalyticsHref, inspectRequestsHref } from "@/lib/inspect-routes";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, Check, Copy, Eye, Globe, Search, WifiOff } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Filter = "all" | "live" | "offline";

type Endpoint = {
  subdomain: string;
  isLive: boolean;
  summary: string;
  sortKey: number;
};

export default function InspectLandingPage() {
  const { data: tunnels = [], isLoading: tunnelsLoading } = useTunnelsQuery();
  const { data: sessions = [], isLoading: sessionsLoading } = useTunnelSessionsQuery();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState<string | null>(null);

  const endpoints = useMemo<Endpoint[]>(() => {
    const names = new Set([
      ...sessions.map((s) => s.subdomain),
      ...tunnels.map((t) => t.subdomain),
    ]);
    return Array.from(names)
      .map((subdomain) => {
        const session = sessions.find((s) => s.subdomain === subdomain);
        const tunnel = tunnels.find((t) => t.subdomain === subdomain);
        const last = session?.connectedAt ?? tunnel?.lastConnectedAt ?? null;
        const summary = session
          ? `Live since ${formatDistanceToNow(new Date(session.connectedAt), { addSuffix: true })}`
          : last
            ? `Last seen ${formatDistanceToNow(new Date(last), { addSuffix: true })}`
            : "Never connected";
        return {
          subdomain,
          isLive: Boolean(session),
          summary,
          sortKey: (session ? 1e15 : 0) + (last ? new Date(last).getTime() : 0),
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [sessions, tunnels]);

  const liveCount = endpoints.filter((e) => e.isLive).length;
  const counts: Record<Filter, number> = {
    all: endpoints.length,
    live: liveCount,
    offline: endpoints.length - liveCount,
  };

  const visible = endpoints.filter((e) => {
    if (filter === "live" && !e.isLive) return false;
    if (filter === "offline" && e.isLive) return false;
    const q = query.trim().toLowerCase();
    return !q || e.subdomain.toLowerCase().includes(q);
  });

  const copyUrl = (subdomain: string) => {
    navigator.clipboard.writeText(`https://${subdomain}.tunl.online`).catch(() => {});
    setCopied(subdomain);
    setTimeout(() => setCopied(null), 1800);
  };

  const loading = tunnelsLoading || sessionsLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inspect"
        description="Watch, replay and chart requests. Kept for 30 minutes."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-muted/50 h-40 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : endpoints.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--hairline-strong)] px-5 py-14 text-center">
          <div className="bg-muted/60 mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--hairline)]">
            <WifiOff className="text-muted-foreground/70 h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold">Nothing to inspect yet</h2>
          <Button nativeButton={false} render={<Link href="/dashboard" />} className="mt-5">
            <Globe /> Go to tunnels
          </Button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Filter endpoints"
              className="bg-muted/60 inline-flex self-start rounded-lg border border-[var(--hairline)] p-0.5"
            >
              {(["all", "live", "offline"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium capitalize transition-colors",
                    filter === key
                      ? "bg-card text-foreground shadow-[0_0_0_1px_var(--hairline),0_1px_2px_color-mix(in_oklab,var(--scrim)_12%,transparent)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {key}
                  <span className="text-muted-foreground tabular-nums">{counts[key]}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="search"
                aria-label="Search endpoints"
                placeholder="Search endpoints…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--hairline-strong)] py-10 text-center">
              <Search className="text-muted-foreground/60 mb-2 h-5 w-5" />
              <p className="text-muted-foreground text-sm">No endpoints match this filter.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((endpoint) => (
                <li
                  key={endpoint.subdomain}
                  className={cn(
                    "surface-card bg-card flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <a
                        href={`https://${endpoint.subdomain}.tunl.online`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-primary block truncate font-mono text-[13px] font-semibold"
                        title={`${endpoint.subdomain}.tunl.online`}
                      >
                        {endpoint.subdomain}
                        <span className="text-muted-foreground font-normal">.tunl.online</span>
                      </a>
                      <p
                        className={cn(
                          "mt-0.5 flex items-center gap-1.5 text-xs",
                          endpoint.isLive
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            endpoint.isLive
                              ? "animate-pulse bg-emerald-500"
                              : "bg-muted-foreground/50",
                          )}
                        />
                        <span className="truncate">{endpoint.summary}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Copy ${endpoint.subdomain} URL`}
                      title="Copy public URL"
                      onClick={() => copyUrl(endpoint.subdomain)}
                      className="shrink-0"
                    >
                      {copied === endpoint.subdomain ? (
                        <Check className="text-primary" />
                      ) : (
                        <Copy />
                      )}
                    </Button>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button
                      nativeButton={false}
                      render={<Link href={inspectRequestsHref(endpoint.subdomain)} />}
                      variant="outline"
                      className="h-8"
                    >
                      <Eye /> Requests
                    </Button>
                    <Button
                      nativeButton={false}
                      render={<Link href={inspectAnalyticsHref(endpoint.subdomain)} />}
                      variant="outline"
                      className="h-8"
                    >
                      <BarChart3 /> Analytics
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
