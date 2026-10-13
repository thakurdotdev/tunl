import type {
  AdminOverviewAnalytics,
  AdminEngagementAnalytics,
  AdminSessionAnalytics,
  BandwidthSummary,
} from "@/lib/types";
import {
  Activity,
  Globe,
  Radio,
  Users,
  Zap,
  TrendingUp,
  Gauge,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils";

interface AdminAnalyticsCardsProps {
  analytics: AdminOverviewAnalytics | undefined;
  engagement: AdminEngagementAnalytics | undefined;
  sessions?: AdminSessionAnalytics | undefined;
  bandwidthSummary?: BandwidthSummary | undefined;
  bandwidthPeriod?: string;
  isLoading: boolean;
  isEngagementLoading: boolean;
  isSessionsLoading?: boolean;
  isBandwidthLoading?: boolean;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  isLoading,
  highlight = false,
}: {
  label: string;
  value: number | string | undefined;
  description: string;
  icon: LucideIcon;
  isLoading: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className="min-w-0 gap-0 p-3 shadow-none sm:p-4">
      <CardContent className="min-w-0 p-0">
        <p className="text-muted-foreground min-h-8 text-xs leading-4 font-medium sm:text-sm sm:leading-5">
          {label}
        </p>
        <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
          <span
            className={`min-w-0 text-2xl font-semibold tracking-tight break-words tabular-nums ${
              highlight ? "text-emerald-400" : "text-foreground"
            }`}
          >
            {isLoading || value == null
              ? "—"
              : typeof value === "number"
                ? value.toLocaleString()
                : value}
          </span>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
              highlight
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-border/60 bg-secondary text-muted-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="text-muted-foreground mt-2 min-h-8 text-[11px] leading-4 sm:text-xs">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsCards({
  analytics,
  engagement,
  sessions,
  bandwidthSummary,
  bandwidthPeriod = "24h",
  isLoading,
  isEngagementLoading,
  isSessionsLoading = false,
  isBandwidthLoading = false,
}: AdminAnalyticsCardsProps) {
  // Row 1: Infrastructure, Concurrency & Edge Load
  const platformMetrics = [
    {
      label: "Registered users",
      value: analytics?.totalUsers ?? 0,
      description: engagement
        ? `▲ +${engagement.newUsersLast24h} in 24h · ${engagement.newUsersLast30d} in 30d`
        : "Accounts in database",
      icon: Users,
      isLoading: isLoading || !analytics,
    },
    {
      label: "Live tunnels",
      value: analytics?.totalActiveSessions ?? 0,
      description: "Active SSH sessions right now",
      icon: Radio,
      highlight: true,
      isLoading: isLoading || !analytics,
    },
    {
      label: "Peak concurrency (24h)",
      value: sessions?.peakConcurrentTunnelsLast24h ?? 0,
      description:
        sessions?.peakConcurrentTunnelsLast24h != null
          ? `Observed 24h high · ${analytics?.totalActiveSessions ?? 0} live now`
          : "Peak concurrent tunnels (24h)",
      icon: TrendingUp,
      isLoading: isSessionsLoading,
    },
    {
      label: `Edge traffic (${bandwidthPeriod})`,
      value:
        bandwidthSummary && bandwidthSummary.totalRequests > 0
          ? `${bandwidthSummary.totalRequests.toLocaleString()} reqs`
          : bandwidthSummary
            ? "0 reqs"
            : undefined,
      description: bandwidthSummary
        ? `${formatBytes(bandwidthSummary.totalBandwidth)} · ${bandwidthSummary.successRate}% success`
        : "Edge requests & data transfer",
      icon: Activity,
      isLoading: isBandwidthLoading,
    },
  ];

  // Row 2: Engagement, PLG Conversion & Asset Utilization
  const stickinessPercent =
    engagement && engagement.mauCount > 0
      ? ((engagement.dauCount / engagement.mauCount) * 100).toFixed(1)
      : undefined;

  const subdomainActivePercent =
    analytics && analytics.totalTunnels > 0 && analytics.activeTunnelsLast30d != null
      ? Math.round((analytics.activeTunnelsLast30d / analytics.totalTunnels) * 100)
      : null;

  const engagementMetrics = [
    {
      label: "Active users",
      value: engagement ? `${engagement.dauCount.toLocaleString()} DAU` : undefined,
      description: engagement
        ? `${engagement.wauCount} WAU · ${engagement.mauCount} active in 30d`
        : "Active accounts in 24h / 7d / 30d",
      icon: Zap,
      isLoading: isEngagementLoading,
    },
    {
      label: "User stickiness",
      value: stickinessPercent ? `${stickinessPercent}%` : undefined,
      description: "DAU / MAU ratio · daily return rate",
      icon: Gauge,
      highlight: stickinessPercent != null && Number(stickinessPercent) >= 20,
      isLoading: isEngagementLoading,
    },
    {
      label: "Guest conversion",
      value: engagement ? `${engagement.conversionRate}%` : undefined,
      description: engagement
        ? `${engagement.totalConversions} converted of ${engagement.uniqueAnonymousDevices} anon devices`
        : "Anon → registered · all time",
      icon: ArrowUpRight,
      isLoading: isEngagementLoading,
    },
    {
      label: "Reserved subdomains",
      value: analytics?.totalTunnels ?? 0,
      description:
        subdomainActivePercent != null
          ? `${analytics?.activeTunnelsLast30d} active in 30d (${subdomainActivePercent}% active)`
          : "Custom domain aliases",
      icon: Globe,
      isLoading: isLoading || !analytics,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 grid-cols-2 gap-3 font-sans sm:gap-4 xl:grid-cols-4">
        {platformMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 font-sans sm:gap-4 xl:grid-cols-4">
        {engagementMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}
