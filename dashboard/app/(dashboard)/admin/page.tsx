"use client";

import { useState } from "react";
import { AdminAnalyticsCards } from "@/components/admin/admin-analytics-cards";
import { AdminAnalyticsInsights } from "@/components/admin/admin-analytics-insights";
import {
  useAdminOverviewAnalytics,
  useAdminEngagementAnalytics,
  useAdminSessionAnalytics,
  useAdminGrowthAnalytics,
  useAdminGeoAnalytics,
  useAdminBandwidthAnalytics,
} from "@/hooks/use-admin";
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
  MapPin,
  Radio,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { countryName, countryFlagUrl, formatBytes } from "@/lib/utils";
import { useAdminPrivacy } from "@/lib/admin-privacy-context";

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
  const { maskEmail, maskIp, maskId } = useAdminPrivacy();
  const overview = useAdminOverviewAnalytics();
  const engagement = useAdminEngagementAnalytics();
  const sessions = useAdminSessionAnalytics();
  const growth = useAdminGrowthAnalytics();
  const geo = useAdminGeoAnalytics();
  const analytics = overview.data;
  const isLoading = overview.isPending;
  const isFetching = [overview, engagement, sessions, growth, geo].some(
    (query) => query.isFetching,
  );
  const [bandwidthPeriod, setBandwidthPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const {
    data: bandwidthData,
    isLoading: isBandwidthLoading,
    isFetching: isBandwidthFetching,
    refetch: refetchBandwidth,
  } = useAdminBandwidthAnalytics(bandwidthPeriod);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeSessions = sessions.data?.activeSessionsList ?? [];

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleRefreshAll = async () => {
    const results = await Promise.all([
      overview.refetch(),
      engagement.refetch(),
      sessions.refetch(),
      growth.refetch(),
      geo.refetch(),
      refetchBandwidth(),
    ]);
    if (results.some((result) => result.isError))
      toast.error("Some analytics could not be refreshed");
    else toast.success("Analytics refreshed (metrics use short server-side caches)");
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
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            Platform analytics
          </h2>
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
      {[overview, engagement, sessions].some((query) => query.isError) && (
        <p
          role="alert"
          className="border-destructive/30 text-destructive rounded-lg border p-3 text-sm"
        >
          Some analytics are unavailable. Refresh to retry.
        </p>
      )}
      <AdminAnalyticsCards
        analytics={analytics}
        engagement={engagement.data}
        sessions={sessions.data}
        bandwidthSummary={bwSummary}
        bandwidthPeriod={bandwidthPeriod}
        isLoading={isLoading}
        isEngagementLoading={engagement.isPending}
        isSessionsLoading={sessions.isPending}
        isBandwidthLoading={isBandwidthLoading}
      />
      <AdminAnalyticsInsights growth={growth} geo={geo} sessions={sessions} />

      {/* Platform Bandwidth & Traffic Telemetry Section */}
      <Card className="gap-5 rounded-xl p-5 shadow-none">
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
                  <span className="font-medium text-amber-400">
                    {bwSummary.totalErrors.toLocaleString()} HTTP 4xx/5xx ({bwSummary.errorRate}%)
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    Includes client 404s, missing paths & edge drops
                  </span>
                </>
              ) : (
                <span className="font-medium text-emerald-400">100% clean delivery (0 errors)</span>
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
            <div className="text-foreground mt-2 font-mono text-xl font-bold">
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
          <div className="mb-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-foreground text-xs font-semibold">
              Top Bandwidth Consuming Endpoints ({bandwidthPeriod})
            </h4>
            <span className="text-muted-foreground hidden text-[11px] sm:block">
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
      </Card>

      {/* Main Grid: Live Sessions & Recent Conversions */}
      <div className="grid min-w-0 items-stretch gap-6 lg:auto-rows-[32rem] lg:grid-cols-2">
        {/* Live Active Sessions Section */}
        <div className="flex min-h-0 min-w-0">
          <div className="bg-card border-border/60 flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border p-4 shadow-none sm:p-5">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="border-border/60 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                    <Radio className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground text-sm font-semibold">Active tunnels</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Live authenticated sessions
                    </p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />{" "}
                  {sessions.data?.totalActiveSessions ?? "—"} Live
                </span>
              </div>

              <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col">
                {sessions.isError ? (
                  <p className="text-destructive flex flex-1 items-center justify-center py-8 text-center text-xs">
                    Unable to load active sessions.
                  </p>
                ) : sessions.isPending ? (
                  <div className="text-muted-foreground flex flex-1 items-center justify-center py-8 text-center text-xs">
                    Loading active sessions...
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="bg-muted/10 flex min-h-48 flex-1 flex-col items-center justify-center rounded-lg px-4 py-8 text-center">
                    <div className="border-border/60 bg-muted/40 mb-3 flex h-11 w-11 items-center justify-center rounded-xl border">
                      <Radio className="text-muted-foreground h-5 w-5" />
                    </div>
                    <p className="text-foreground text-sm font-medium">No active tunnel sessions</p>
                    <p className="text-muted-foreground mt-1 max-w-56 text-xs leading-relaxed">
                      Connected tunnels will appear here in real time.
                    </p>
                  </div>
                ) : (
                  <div
                    className="divide-border/60 max-h-[26rem] min-h-0 min-w-0 flex-1 [scrollbar-width:thin] divide-y overflow-y-auto overscroll-contain pr-1 lg:max-h-none"
                    tabIndex={0}
                    role="region"
                    aria-label="Active tunnel sessions"
                  >
                    {activeSessions.map((session) => (
                      <div key={session.id} className="group min-w-0 space-y-2 py-3.5">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span
                              className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-medium text-emerald-400"
                              title={session.subdomain}
                            >
                              <Globe className="h-3 w-3 shrink-0" />
                              <span className="truncate">{session.subdomain}</span>
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
                              className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-2"
                              title="Copy URL"
                              aria-label={`Copy URL for ${session.subdomain}`}
                            >
                              {copiedKey === `sub-${session.id}` ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <Link
                            href={`/admin/audit?search=${encodeURIComponent(session.subdomain)}`}
                            className="text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
                            title="Inspect Audit Logs for Subdomain"
                          >
                            Audit <ArrowUpRight className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
                          <p
                            className="text-muted-foreground min-w-0 truncate"
                            title={
                              session.userEmail ? maskEmail(session.userEmail) : "Anonymous user"
                            }
                          >
                            {session.userEmail ? maskEmail(session.userEmail) : "Anonymous user"}
                          </p>
                          <span className="text-muted-foreground shrink-0 text-[11px] whitespace-nowrap">
                            {formatShortRelativeTime(session.connectedAt)}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          <span className="min-w-0 font-mono break-all">
                            {session.remoteIp ? maskIp(session.remoteIp) : "Unknown IP"}
                          </span>
                          {(session.city || session.country) && (
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              {session.country && countryFlagUrl(session.country) ? (
                                <Image
                                  unoptimized
                                  width={16}
                                  height={12}
                                  src={countryFlagUrl(session.country, 16)!}
                                  alt=""
                                  className="h-3 w-4 shrink-0 rounded-[1px] object-cover"
                                />
                              ) : (
                                <MapPin className="h-3 w-3 shrink-0" />
                              )}
                              <span className="min-w-0 break-words">
                                {[session.city, countryName(session.country)]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-border/60 mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
              <span className="text-muted-foreground">
                Showing {activeSessions.length} of {sessions.data?.totalActiveSessions ?? "—"}
              </span>
              <Link
                href="/admin/audit"
                className="text-foreground hover:text-primary inline-flex items-center gap-1 font-medium transition-colors"
              >
                View audit stream <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Conversions */}
        <div className="flex min-h-0 min-w-0">
          <div className="bg-card border-border/60 flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border p-4 shadow-none sm:p-5">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="border-border/60 flex shrink-0 flex-wrap items-center gap-3 border-b pb-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="bg-secondary text-foreground border-border/60 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground text-sm font-semibold">Recent conversions</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Anonymous devices linked to accounts
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col text-xs">
                {engagement.isPending ? (
                  <p className="text-muted-foreground flex flex-1 items-center justify-center">
                    Loading conversions...
                  </p>
                ) : engagement.isError ? (
                  <p role="alert" className="text-destructive flex flex-1 items-center justify-center">
                    Unable to load conversions.
                  </p>
                ) : engagement.data.recentConversions.length === 0 ? (
                  <div className="bg-muted/10 flex min-h-20 flex-1 flex-col items-center justify-center rounded-lg px-4 py-3 text-center">
                    <p className="text-foreground font-medium">No conversions yet</p>
                    <p className="text-muted-foreground mx-auto mt-1 max-w-64 text-[11px] leading-relaxed">
                      Linked accounts will appear here when anonymous devices convert.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-border/60 max-h-60 min-h-0 min-w-0 flex-1 [scrollbar-width:thin] divide-y overflow-y-auto overscroll-contain pr-1 lg:max-h-none">
                    {engagement.data.recentConversions.map((conversion) => (
                      <li
                        key={conversion.anonymousId}
                        className="flex min-w-0 items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono" title={maskId(conversion.anonymousId)}>
                            {maskId(conversion.anonymousId)}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {maskEmail(conversion.userEmail)}
                          </p>
                        </div>
                        <span className="text-muted-foreground shrink-0">
                          {formatShortRelativeTime(conversion.linkedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="border-border/60 mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
              <span className="text-muted-foreground">Account directory</span>
              <Link
                href="/admin/users"
                className="text-foreground hover:text-primary inline-flex items-center gap-1 font-medium transition-colors"
              >
                View users <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
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
