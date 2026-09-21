"use client";

import { useState } from "react";
import { AdminAnalyticsCards } from "@/components/admin/admin-analytics-cards";
import { useAdminAnalytics, useAdminBandwidthAnalytics } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  Clock,
  Copy,
  Database,
  Globe,
  Layers,
  Radio,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatShortRelativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminOverviewPage() {
  const { data: analytics, isLoading, isFetching, refetch } = useAdminAnalytics();
  const [bandwidthPeriod, setBandwidthPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const {
    data: bandwidthData,
    isLoading: isBandwidthLoading,
    isFetching: isBandwidthFetching,
    refetch: refetchBandwidth,
  } = useAdminBandwidthAnalytics(bandwidthPeriod);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeSessions = analytics?.activeSessionsList ?? [];

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleRefreshAll = () => {
    refetch();
    refetchBandwidth();
    toast.info("Telemetry metrics refreshed");
  };

  const bwSummary = bandwidthData?.summary ?? {
    totalRequests: 0,
    totalBytesIn: 0,
    totalBytesOut: 0,
    totalBandwidth: 0,
    totalErrors: 0,
    avgDurationMs: 0,
    errorRate: 0,
    successRate: 100,
  };
  const topSubdomains = bandwidthData?.topSubdomains ?? [];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Infrastructure Telemetry</h2>
          <p className="text-muted-foreground text-xs">
            Global tunnel connections, bandwidth transfer, latency, and identity claims overview.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRefreshAll}
          disabled={isFetching || isBandwidthFetching}
          className="border-border/60 h-8 gap-1.5 px-3 text-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              isFetching || isBandwidthFetching ? "text-primary animate-spin" : ""
            }`}
          />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Analytics Top KPI Cards */}
      <AdminAnalyticsCards analytics={analytics} isLoading={isLoading} />

      {/* Platform Bandwidth & Traffic Telemetry Section */}
      <div className="bg-card border-border/60 rounded-xl border p-5 shadow-2xs">
        <div className="border-border/60 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                Platform Bandwidth & Traffic Telemetry
              </h3>
              <p className="text-muted-foreground text-xs">
                Global ingress/egress bytes, request volume, average latency, and success rates
              </p>
            </div>
          </div>

          {/* Period Toggle */}
          <div className="border-border/60 bg-muted/40 flex items-center rounded-lg border p-0.5 text-xs font-medium">
            {(["24h", "7d", "30d"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBandwidthPeriod(p)}
                className={`rounded-md px-3 py-1 font-mono text-xs transition-all ${
                  bandwidthPeriod === p
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Telemetry KPI Cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Bandwidth */}
          <div className="border-border/60 bg-muted/20 rounded-lg border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Bandwidth Transferred
              </span>
              <Database className="text-muted-foreground/60 h-3.5 w-3.5" />
            </div>
            <div className="text-foreground mt-2 font-mono text-xl font-bold">
              {isBandwidthLoading ? "..." : formatBytes(bwSummary.totalBandwidth)}
            </div>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 font-mono text-[10px]">
              <span className="flex items-center text-emerald-400">
                <ArrowDownLeft className="mr-0.5 h-3 w-3" /> {formatBytes(bwSummary.totalBytesIn)}
              </span>
              <span className="flex items-center text-cyan-400">
                <ArrowUpRight className="mr-0.5 h-3 w-3" /> {formatBytes(bwSummary.totalBytesOut)}
              </span>
            </div>
          </div>

          {/* Total Requests */}
          <div className="border-border/60 bg-muted/20 rounded-lg border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Total Request Volume
              </span>
              <Activity className="text-muted-foreground/60 h-3.5 w-3.5" />
            </div>
            <div className="text-foreground mt-2 font-mono text-xl font-bold">
              {isBandwidthLoading ? "..." : bwSummary.totalRequests.toLocaleString()}
            </div>
            <div className="mt-1.5 flex flex-col gap-0.5 text-[11px]">
              {bwSummary.totalErrors > 0 ? (
                <>
                  <span className="text-amber-400 font-medium">
                    {bwSummary.totalErrors.toLocaleString()} HTTP 4xx/5xx ({bwSummary.errorRate}%)
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    Includes client 404s, missing paths & edge drops
                  </span>
                </>
              ) : (
                <span className="text-emerald-400 font-medium">100% clean delivery (0 errors)</span>
              )}
            </div>
          </div>

          {/* Avg Latency */}
          <div className="border-border/60 bg-muted/20 rounded-lg border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Average Platform Latency
              </span>
              <Clock className="text-muted-foreground/60 h-3.5 w-3.5" />
            </div>
            <div className="text-foreground mt-2 font-mono text-xl font-bold">
              {isBandwidthLoading ? "..." : `${bwSummary.avgDurationMs}ms`}
            </div>
            <span className="text-muted-foreground mt-1 block font-mono text-[10px]">
              {bwSummary.avgDurationMs < 100 ? "Optimal performance (<100ms)" : "Standard routing"}
            </span>
          </div>

          {/* Success Rate */}
          <div className="border-border/60 bg-muted/20 rounded-lg border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                2xx/3xx Edge Delivery
              </span>
              <Zap className="text-muted-foreground/60 h-3.5 w-3.5" />
            </div>
            <div className="mt-2 font-mono text-xl font-bold text-foreground">
              {isBandwidthLoading ? "..." : `${bwSummary.successRate}%`}
            </div>
            <span className="text-muted-foreground mt-1 block text-[10px]">
              {bwSummary.totalRequests > 0
                ? "HTTP 2xx/3xx successful application responses"
                : "No tunnel traffic in this window"}
            </span>
          </div>
        </div>

        {/* Top Bandwidth Subdomains Table */}
        <div className="mt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-foreground text-xs font-semibold">
              Top Bandwidth Consuming Endpoints ({bandwidthPeriod})
            </h4>
            <span className="text-muted-foreground text-[11px]">
              Audit logs viewable • Request inspection private to tunnel owner
            </span>
          </div>

          {isBandwidthLoading ? (
            <div className="text-muted-foreground py-6 text-center font-mono text-xs">
              Aggregating bandwidth telemetry...
            </div>
          ) : topSubdomains.length === 0 ? (
            <div className="text-muted-foreground border-border/40 bg-muted/10 rounded-lg border py-6 text-center font-mono text-xs">
              No bandwidth records in the selected timeframe ({bandwidthPeriod}).
            </div>
          ) : (
            <div className="border-border/60 overflow-x-auto rounded-lg border">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-muted/30 text-muted-foreground border-border/60 border-b text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Subdomain Endpoint</th>
                    <th className="p-2.5">Request Count</th>
                    <th className="p-2.5">Ingress (Bytes In)</th>
                    <th className="p-2.5">Egress (Bytes Out)</th>
                    <th className="p-2.5">Total Bandwidth</th>
                    <th className="p-2.5 text-right">Audit Stream</th>
                  </tr>
                </thead>
                <tbody className="divide-border/40 divide-y">
                  {topSubdomains.map((sub) => (
                    <tr key={sub.subdomain} className="hover:bg-muted/20 transition-colors">
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 font-bold text-cyan-400">
                          <Globe className="h-3 w-3 opacity-70" />
                          {sub.subdomain}.tunl.online
                        </span>
                      </td>
                      <td className="text-foreground p-2.5">{sub.requestCount.toLocaleString()}</td>
                      <td className="p-2.5 text-emerald-400">{formatBytes(sub.bytesIn)}</td>
                      <td className="p-2.5 text-cyan-400">{formatBytes(sub.bytesOut)}</td>
                      <td className="text-foreground p-2.5 font-semibold">
                        {formatBytes(sub.totalBytes)}
                      </td>
                      <td className="p-2.5 text-right">
                        <Link
                          href={`/admin/audit?search=${encodeURIComponent(sub.subdomain)}`}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] font-semibold"
                        >
                          Audit Stream <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Live Sessions & Traffic Insights */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Live Active Sessions Section */}
        <div className="lg:col-span-6">
          <div className="bg-card border-border/60 flex h-full flex-col justify-between rounded-lg border p-5 shadow-2xs">
            <div>
              <div className="border-border/60 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/15">
                    <Radio className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold">Live Active Tunnels</h3>
                    <p className="text-muted-foreground text-xs">Active SSH proxy sessions</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />{" "}
                  {analytics?.totalActiveSessions ?? activeSessions.length} Live
                </span>
              </div>

              <div className="mt-4">
                {isLoading ? (
                  <div className="text-muted-foreground py-8 text-center text-xs">
                    Loading active sessions...
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="border-border/60 bg-muted/40 mb-2 flex h-9 w-9 items-center justify-center rounded-md border">
                      <Radio className="text-muted-foreground h-4 w-4" />
                    </div>
                    <p className="text-muted-foreground text-xs font-medium">
                      No active tunnel sessions
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Live sessions will appear here when connected
                    </p>
                  </div>
                ) : (
                  <div className="divide-border/60 divide-y">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="hover:bg-muted/20 group flex items-center justify-between py-2.5 transition-colors"
                      >
                        <div className="space-y-0.5 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-bold text-emerald-400">
                              <Globe className="h-2.5 w-2.5" />
                              {session.subdomain}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `${session.subdomain}.tunl.online`,
                                  "subdomain",
                                  `sub-${session.id}`,
                                )
                              }
                              className="text-muted-foreground/50 hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                              title="Copy URL"
                            >
                              {copiedKey === `sub-${session.id}` ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                            <span className="text-muted-foreground text-xs">
                              {session.remoteIp}
                            </span>
                          </div>
                          <p className="text-muted-foreground font-sans text-xs">
                            {session.userEmail ?? "Anonymous user"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {formatShortRelativeTime(session.connectedAt)}
                          </span>
                          <Link
                            href={`/admin/audit?search=${encodeURIComponent(session.subdomain)}`}
                            className="text-muted-foreground hover:text-foreground border-border/60 bg-muted/40 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors"
                            title="Inspect Audit Logs for Subdomain"
                          >
                            Audit <ArrowUpRight className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-border/60 mt-4 flex items-center justify-between border-t pt-3 text-xs">
              <span className="text-muted-foreground">Historical Audit Trail</span>
              <Link
                href="/admin/audit"
                className="text-foreground hover:text-primary inline-flex items-center gap-1 font-semibold transition-colors"
              >
                View Live Audit Stream <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Traffic & Conversion Analytics */}
        <div className="lg:col-span-6">
          <div className="bg-card border-border/60 flex h-full flex-col justify-between rounded-lg border p-5 shadow-2xs">
            <div>
              <div className="border-border/60 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-secondary text-foreground border-border/60 flex h-8 w-8 items-center justify-center rounded-md border">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold">Traffic & Conversion</h3>
                    <p className="text-muted-foreground text-xs">
                      Session distribution & identity claims
                    </p>
                  </div>
                </div>
                <span className="border-border/60 bg-secondary text-secondary-foreground rounded-md border px-2.5 py-0.5 text-[10px] font-semibold">
                  Insights
                </span>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <div className="text-muted-foreground mb-1.5 flex justify-between text-xs font-medium">
                    <span>Auth Users ({analytics?.totalAuthEvents ?? 0})</span>
                    <span>Anonymous ({analytics?.totalAnonEvents ?? 0})</span>
                  </div>
                  {(() => {
                    const auth = analytics?.totalAuthEvents ?? 0;
                    const anon = analytics?.totalAnonEvents ?? 0;
                    const total = auth + anon;
                    const authPct = total > 0 ? Math.round((auth / total) * 100) : 50;
                    return (
                      <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
                        <div
                          style={{ width: `${authPct}%` }}
                          className="bg-emerald-400 transition-all duration-500"
                        />
                        <div
                          style={{ width: `${100 - authPct}%` }}
                          className="bg-zinc-600 transition-all duration-500"
                        />
                      </div>
                    );
                  })()}
                </div>

                <div className="border-border/60 bg-muted/20 flex items-center justify-between rounded-md border p-3">
                  <div>
                    <span className="text-foreground block text-xs font-medium">
                      Converted Anonymous Devices
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Devices linked to authenticated accounts
                    </span>
                  </div>
                  <span className="text-foreground text-xl font-bold">
                    {isLoading ? "..." : (analytics?.totalLinkedIdentities ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-border/60 mt-4 flex items-center justify-between border-t pt-4 text-xs">
              <span className="text-muted-foreground">Manage Directory</span>
              <Link
                href="/admin/users"
                className="text-foreground hover:text-primary inline-flex items-center gap-1 font-semibold transition-colors"
              >
                Inspect Users <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plan Tier Utilization */}
      <div className="bg-card border-border/60 rounded-lg border p-5 shadow-2xs">
        <div className="border-border/60 flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-secondary text-foreground border-border/60 flex h-8 w-8 items-center justify-center rounded-md border">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                Subscription Plan Tier Utilization
              </h3>
              <p className="text-muted-foreground text-xs">
                Active subscribers and resource quota caps per plan
              </p>
            </div>
          </div>
          <span className="border-border/60 bg-secondary text-secondary-foreground rounded-md border px-2.5 py-0.5 text-[10px] font-semibold">
            Quota Caps
          </span>
        </div>

        <div className="mt-4 text-xs">
          {isLoading ? (
            <div className="text-muted-foreground py-6 text-center">Loading plan statistics...</div>
          ) : analytics?.planDistribution.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center">
              No subscription plans found.
            </div>
          ) : (
            <div className="divide-border/60 divide-y">
              {analytics?.planDistribution.map((plan) => (
                <div
                  key={plan.planName}
                  className="hover:bg-muted/20 flex items-center justify-between py-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-foreground text-xs font-semibold capitalize">
                      {plan.planName} Tier
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Max Subdomains:{" "}
                      <strong className="text-foreground font-mono">
                        {plan.maxSubdomains ?? 1}
                      </strong>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Max Tunnels:{" "}
                      <strong className="text-foreground font-mono">
                        {plan.maxActiveTunnels ?? 1}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-sans">
                    <span className="text-sm font-bold text-emerald-400">{plan.userCount}</span>
                    <span className="text-muted-foreground text-xs">subscribers</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
