import type { AdminOverviewAnalytics, AdminEngagementAnalytics } from "@/lib/types";
import {
  Activity,
  Globe,
  Radio,
  Users,
  UserPlus,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AdminAnalyticsCardsProps {
  analytics: AdminOverviewAnalytics | undefined;
  engagement: AdminEngagementAnalytics | undefined;
  isLoading: boolean;
  isEngagementLoading: boolean;
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
  value: number | undefined;
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
            className={`min-w-0 text-2xl font-semibold tracking-tight break-words tabular-nums ${highlight ? "text-emerald-400" : "text-foreground"}`}
          >
            {isLoading || value == null ? "—" : value.toLocaleString()}
          </span>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${highlight ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-border/60 bg-secondary text-muted-foreground"}`}
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
  isLoading,
  isEngagementLoading,
}: AdminAnalyticsCardsProps) {
  const metrics = [
    {
      label: "Registered users",
      value: analytics?.totalUsers ?? 0,
      description: engagement ? `▲ +${engagement.newUsersLast24h} in 24h` : "Accounts in database",
      icon: Users,
    },
    {
      label: "Live tunnels",
      value: analytics?.totalActiveSessions ?? 0,
      description: "Active SSH sessions",
      icon: Radio,
      highlight: true,
    },
    {
      label: "Reserved subdomains",
      value: analytics?.totalTunnels ?? 0,
      description: "Custom domain aliases",
      icon: Globe,
    },
    {
      label: "Audit events",
      value: analytics?.totalEvents ?? 0,
      description: "Connect & disconnect logs",
      icon: Activity,
    },
  ];

  const engagementMetrics = [
    {
      label: "New users (24h)",
      value: engagement?.newUsersLast24h,
      description: engagement
        ? `${engagement.newUsersLast7d} in 7d · ${engagement.newUsersLast30d} in 30d`
        : "Rolling signup windows",
      icon: UserPlus,
    },
    {
      label: "Daily active users",
      value: engagement?.dauCount,
      description: "Active accounts · last 24h",
      icon: Activity,
    },
    {
      label: "Weekly active users",
      value: engagement?.wauCount,
      description: engagement
        ? `${engagement.mauCount} active in 30d`
        : "Active accounts · last 7d",
      icon: Users,
    },
    {
      label: "Converted users",
      value: engagement?.totalConversions,
      description: "Anon → registered · all time",
      icon: ArrowUpRight,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 grid-cols-2 gap-3 font-sans sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} isLoading={isLoading || !analytics} />
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 font-sans sm:gap-4 xl:grid-cols-4">
        {engagementMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} isLoading={isEngagementLoading} />
        ))}
      </div>
    </div>
  );
}
