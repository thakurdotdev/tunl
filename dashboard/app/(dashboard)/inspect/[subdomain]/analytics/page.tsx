"use client";

import { Button } from "@/components/ui/button";
import { useSubdomainAnalytics } from "@/hooks/use-inspector";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
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
    error: analyticsError,
    refetch,
  } = useSubdomainAnalytics(subdomain, period);

  const isForbidden = (analyticsError as any)?.status === 403;

  // 403 Security Screen (Enforced for all unauthorized users, including Admins)
  if (isForbidden) {
    return (
      <div className="border-destructive/30 bg-destructive/10 mx-auto my-16 max-w-lg rounded-xl border p-8 text-center font-sans">
        <ShieldAlert className="text-destructive mx-auto mb-3 h-10 w-10" />
        <h2 className="text-foreground text-base font-bold">403 — Private Tunnel Endpoint</h2>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          You do not have permission to view analytics for{" "}
          <strong className="text-foreground font-mono">{subdomain}.tunl.online</strong>. Tunnel
          traffic, request volume, and bandwidth metrics are strictly private to the tunnel owner.
          Even system administrators cannot inspect other users&apos; private tunnel analytics.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="border-border text-xs">
              Return to Dashboard
            </Button>
          </Link>
          <Link href="/inspect">
            <Button size="sm" className="text-xs">
              Inspect My Tunnels
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Proper Loading State / Skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 font-sans">
        {/* Header Skeleton */}
        <div className="border-border/60 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted h-8 w-8 animate-pulse rounded-md" />
            <div className="space-y-1.5">
              <div className="bg-muted h-5 w-48 animate-pulse rounded" />
              <div className="bg-muted h-3.5 w-64 animate-pulse rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-muted h-8 w-28 animate-pulse rounded-lg" />
            <div className="bg-muted h-8 w-8 animate-pulse rounded-md" />
          </div>
        </div>

        {/* 4 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`kpi-skel-${i}`}
              className="border-border/60 bg-card rounded-lg border p-4 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="bg-muted h-3.5 w-24 animate-pulse rounded" />
                <div className="bg-muted h-7 w-7 animate-pulse rounded-md" />
              </div>
              <div className="bg-muted mt-4 h-7 w-32 animate-pulse rounded" />
              <div className="bg-muted mt-2 h-3.5 w-20 animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="border-border/60 bg-card rounded-lg border p-5 shadow-2xs">
          <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          <div className="bg-muted/40 mt-6 h-48 w-full animate-pulse rounded-md" />
        </div>
      </div>
    );
  }

  // General Error State
  if (analyticsError) {
    return (
      <div className="border-border/60 bg-card mx-auto my-12 max-w-md rounded-xl border p-6 text-center font-sans">
        <AlertCircle className="text-destructive mx-auto mb-2.5 h-8 w-8" />
        <h3 className="text-foreground text-sm font-bold">Failed to load tunnel analytics</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          {(analyticsError as any)?.message ||
            "An unexpected error occurred while fetching telemetry."}
        </p>
        <Button size="sm" onClick={() => refetch()} className="mt-4 text-xs">
          Retry Query
        </Button>
      </div>
    );
  }

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
                {p}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8"
            title="Refresh Analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "text-primary animate-spin" : ""}`} />
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
                  : "Slow"}
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
            <span className="font-mono text-2xl font-bold tracking-tight text-emerald-400">
              {successRate.toFixed(1)}%
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              {summary.errorRate}% error rate
            </span>
          </div>
        </div>
      </div>

      {/* Traffic & Request Volume Chart */}
      <div className="border-border/60 bg-card flex flex-col gap-4 rounded-lg border p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground text-sm font-semibold">Traffic & Request Volume</h3>
            <p className="text-muted-foreground text-xs">
              Hourly request frequency and error distribution over {period}
            </p>
          </div>
          <div className="text-muted-foreground flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary h-2 w-2 rounded-full" /> Total Requests
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Errors
            </span>
          </div>
        </div>

        {timeSeries.length === 0 ? (
          <div className="text-muted-foreground border-border/40 bg-muted/10 flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-xs">
            <BarChart3 className="text-muted-foreground/40 h-8 w-8" />
            <span>No traffic recorded during this {period} timeframe</span>
          </div>
        ) : (
          <div className="flex h-48 items-end gap-1 pt-6">
            {timeSeries.map((bucket, idx) => {
              const reqPct = Math.round((bucket.requestCount / maxRequests) * 100);
              const errPct =
                bucket.requestCount > 0
                  ? Math.round((bucket.errorCount / bucket.requestCount) * reqPct)
                  : 0;

              return (
                <div key={idx} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    style={{ height: `${Math.max(4, reqPct)}%` }}
                    className="bg-primary/20 group-hover:bg-primary/40 relative w-full overflow-hidden rounded-xs transition-all"
                  >
                    {errPct > 0 && (
                      <div
                        style={{ height: `${errPct}%` }}
                        className="absolute bottom-0 w-full bg-rose-500/80"
                      />
                    )}
                  </div>

                  {/* Tooltip on hover */}
                  <div className="border-border/80 bg-card/95 pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 flex-col gap-1 rounded-md border p-2 text-[10px] whitespace-nowrap shadow-lg group-hover:flex">
                    <span className="text-muted-foreground font-mono">
                      {format(new Date(bucket.bucketStart), "MMM d, HH:mm")}
                    </span>
                    <span className="text-foreground font-bold">
                      {bucket.requestCount} request{bucket.requestCount === 1 ? "" : "s"}
                    </span>
                    {bucket.errorCount > 0 && (
                      <span className="font-semibold text-rose-400">
                        {bucket.errorCount} error{bucket.errorCount === 1 ? "" : "s"}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      In: {formatBytes(bucket.bytesIn)} | Out: {formatBytes(bucket.bytesOut)}
                    </span>
                    <span className="text-muted-foreground">Latency: {bucket.avgDurationMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
