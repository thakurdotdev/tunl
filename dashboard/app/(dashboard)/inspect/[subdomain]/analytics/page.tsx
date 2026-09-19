"use client";

import { Button } from "@/components/ui/button";
import { useSubdomainAnalytics } from "@/hooks/use-inspector";
import { format } from "date-fns";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  Database,
  RefreshCw,
  ShieldAlert,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type Period = "24h" | "7d" | "30d";

export default function SubdomainAnalyticsPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params.subdomain;
  const [period, setPeriod] = useState<Period>("24h");

  const {
    data: analytics,
    isLoading,
    isFetching,
    refetch,
  } = useSubdomainAnalytics(subdomain, period);

  const summary = analytics?.summary ?? {
    totalRequests: 0,
    totalBytesIn: 0,
    totalBytesOut: 0,
    totalErrors: 0,
    avgDurationMs: 0,
    errorRate: 0,
  };

  const timeSeries = analytics?.timeSeries ?? [];
  const maxRequests = Math.max(1, ...timeSeries.map((b) => b.requestCount));
  const maxBandwidth = Math.max(1, ...timeSeries.map((b) => b.bytesIn + b.bytesOut));

  const totalBandwidth = summary.totalBytesIn + summary.totalBytesOut;
  const successRate = summary.totalRequests > 0 ? Math.max(0, 100 - summary.errorRate) : 100;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Top Header */}
      <div className="border-border/60 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/inspect/${subdomain}`}>
            <Button variant="ghost" size="icon-xs" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-primary text-xs font-semibold">&gt;_</span>
              <h1 className="text-foreground text-lg font-bold tracking-tight">
                {subdomain}.tunl.online
              </h1>
              <span className="border-primary/20 bg-primary/10 text-primary rounded-md border px-2 py-0.5 text-[10px] font-semibold">
                Analytics
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Bandwidth, traffic volume, latency, and error rate telemetry.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Period Toggle */}
          <div className="border-border/60 bg-muted/40 flex items-center rounded-lg border p-0.5 text-xs font-medium">
            {(["24h", "7d", "30d"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-md px-2.5 py-1 text-xs transition-all ${
                  period === p
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "24h" ? "24 Hours" : p === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 px-2.5 text-xs font-medium"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "text-primary animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Requests */}
        <div className="border-border/60 bg-card flex flex-col justify-between rounded-lg border p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Total Requests
            </span>
            <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-md">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-foreground font-mono text-2xl font-bold tracking-tight">
              {summary.totalRequests.toLocaleString()}
            </span>
            {summary.totalErrors > 0 ? (
              <span className="inline-flex items-center gap-1 rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
                <ShieldAlert className="h-3 w-3" />
                {summary.totalErrors} error{summary.totalErrors === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                100% OK
              </span>
            )}
          </div>
        </div>

        {/* Total Bandwidth */}
        <div className="border-border/60 bg-card flex flex-col justify-between rounded-lg border p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Bandwidth Transferred
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
              <Database className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-foreground font-mono text-2xl font-bold tracking-tight">
              {formatBytes(totalBandwidth)}
            </span>
            <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10px]">
              <span className="flex items-center text-emerald-400">
                <ArrowDownLeft className="h-3 w-3" /> {formatBytes(summary.totalBytesIn)}
              </span>
              <span className="flex items-center text-cyan-400">
                <ArrowUpRight className="h-3 w-3" /> {formatBytes(summary.totalBytesOut)}
              </span>
            </div>
          </div>
        </div>

        {/* Average Latency */}
        <div className="border-border/60 bg-card flex flex-col justify-between rounded-lg border p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Average Latency
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-foreground font-mono text-2xl font-bold tracking-tight">
              {summary.avgDurationMs}ms
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                summary.avgDurationMs < 100
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : summary.avgDurationMs < 300
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-400"
              }`}
            >
              {summary.avgDurationMs < 100
                ? "Fast"
                : summary.avgDurationMs < 300
                  ? "Moderate"
                  : "High Latency"}
            </span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="border-border/60 bg-card flex flex-col justify-between rounded-lg border p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Success Rate
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-foreground font-mono text-2xl font-bold tracking-tight">
              {successRate.toFixed(1)}%
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {summary.totalErrors} error{summary.totalErrors === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* Traffic & Bandwidth Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Request Volume Chart */}
        <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs">
          <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-primary h-3.5 w-3.5" />
              <span className="text-foreground text-xs font-semibold">Request Volume</span>
            </div>
            <span className="text-muted-foreground font-mono text-[11px]">
              {summary.totalRequests} total
            </span>
          </div>

          <div className="p-4">
            {timeSeries.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center text-xs">
                No request volume recorded for this time window.
              </div>
            ) : (
              <div className="flex h-44 items-end gap-1.5 pt-4">
                {timeSeries.map((bucket, idx) => {
                  const heightPercent = Math.max(
                    6,
                    Math.round((bucket.requestCount / maxRequests) * 100),
                  );
                  return (
                    <div
                      key={idx}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="bg-popover text-popover-foreground border-border/60 pointer-events-none absolute -top-12 z-20 hidden w-max rounded-md border px-2 py-1 text-[10px] shadow-md group-hover:block">
                        <div className="font-semibold">{bucket.requestCount} requests</div>
                        <div className="text-muted-foreground font-mono">
                          {format(new Date(bucket.bucketStart), "MMM d, HH:mm")}
                        </div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t transition-all ${
                          bucket.errorCount > 0
                            ? "from-primary/70 bg-gradient-to-t to-rose-500"
                            : "from-primary/50 to-primary hover:from-primary/70 hover:to-primary bg-gradient-to-t"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="border-border/40 text-muted-foreground flex items-center justify-between border-t pt-2 font-mono text-[10px]">
              <span>
                {period === "24h" ? "24 hours ago" : period === "7d" ? "7 days ago" : "30 days ago"}
              </span>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* Bandwidth Volume Chart */}
        <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs">
          <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-foreground text-xs font-semibold">Bandwidth Volume</span>
            </div>
            <span className="text-muted-foreground font-mono text-[11px]">
              {formatBytes(totalBandwidth)}
            </span>
          </div>

          <div className="p-4">
            {timeSeries.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center text-xs">
                No bandwidth volume recorded for this time window.
              </div>
            ) : (
              <div className="flex h-44 items-end gap-1.5 pt-4">
                {timeSeries.map((bucket, idx) => {
                  const bTotal = bucket.bytesIn + bucket.bytesOut;
                  const heightPercent = Math.max(6, Math.round((bTotal / maxBandwidth) * 100));
                  return (
                    <div
                      key={idx}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    >
                      {/* Tooltip */}
                      <div className="bg-popover text-popover-foreground border-border/60 pointer-events-none absolute -top-12 z-20 hidden w-max rounded-md border px-2 py-1 text-[10px] shadow-md group-hover:block">
                        <div className="font-semibold">{formatBytes(bTotal)}</div>
                        <div className="text-muted-foreground font-mono">
                          {format(new Date(bucket.bucketStart), "MMM d, HH:mm")}
                        </div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-t bg-gradient-to-t from-blue-600/50 to-cyan-400 transition-all hover:from-blue-600/70 hover:to-cyan-300"
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="border-border/40 text-muted-foreground flex items-center justify-between border-t pt-2 font-mono text-[10px]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Inbound
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" /> Outbound
                </span>
              </div>
              <span>Now</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly / Time-Bucket Telemetry Table */}
      <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs">
        <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5 text-xs">
          <span className="text-foreground text-xs font-semibold">Activity Breakdown</span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {timeSeries.length} bucket{timeSeries.length === 1 ? "" : "s"}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14">
            <div className="border-primary/20 border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
            <p className="text-muted-foreground text-xs">Loading analytics data...</p>
          </div>
        ) : timeSeries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
            <BarChart3 className="text-muted-foreground/30 h-8 w-8" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">No activity recorded yet</h3>
              <p className="text-muted-foreground max-w-sm text-xs">
                As requests flow through your tunnel, telemetry will be aggregated into hourly
                buckets here.
              </p>
            </div>
          </div>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-semibold tracking-wider uppercase">
                  <th className="p-4">Time Window</th>
                  <th className="p-4 text-right">Requests</th>
                  <th className="p-4 text-right">Bytes In</th>
                  <th className="p-4 text-right">Bytes Out</th>
                  <th className="p-4 text-right">Avg Latency</th>
                  <th className="p-4 text-right">Error Rate</th>
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {[...timeSeries].reverse().map((bucket, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="text-foreground p-4 font-mono text-xs">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                        {format(new Date(bucket.bucketStart), "yyyy-MM-dd HH:mm")} UTC
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-semibold">
                      {bucket.requestCount.toLocaleString()}
                    </td>
                    <td className="text-muted-foreground p-4 text-right font-mono text-[11px]">
                      {formatBytes(bucket.bytesIn)}
                    </td>
                    <td className="text-muted-foreground p-4 text-right font-mono text-[11px]">
                      {formatBytes(bucket.bytesOut)}
                    </td>
                    <td className="p-4 text-right font-mono text-xs">{bucket.avgDurationMs}ms</td>
                    <td className="p-4 text-right">
                      {bucket.errorCount > 0 ? (
                        <span className="inline-block rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-400">
                          {bucket.errorRate}% ({bucket.errorCount})
                        </span>
                      ) : (
                        <span className="inline-block rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                          0%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
