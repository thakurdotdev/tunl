import type { AdminAnalytics } from "@/lib/types";
import { Activity, Globe, Radio, Users } from "lucide-react";

interface AdminAnalyticsCardsProps {
  analytics: AdminAnalytics | undefined;
  isLoading: boolean;
}

export function AdminAnalyticsCards({ analytics, isLoading }: AdminAnalyticsCardsProps) {
  return (
    <div className="grid gap-4 font-mono sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-card border-border/80 rounded-lg border p-4">
        <div className="text-muted-foreground flex items-center justify-between">
          <span className="text-xs font-medium">Total Registered Users</span>
          <Users className="text-primary h-4 w-4" />
        </div>
        <div className="mt-2 font-mono text-2xl font-bold">
          {isLoading ? "..." : (analytics?.totalUsers ?? 0)}
        </div>
        <span className="text-muted-foreground text-[11px]">Accounts in database</span>
      </div>

      <div className="bg-card border-border/80 rounded-lg border p-4">
        <div className="text-muted-foreground flex items-center justify-between">
          <span className="font-mono text-xs font-medium">Active Live Tunnels</span>
          <Radio className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="mt-2 font-mono text-2xl font-bold text-emerald-400">
          {isLoading ? "..." : (analytics?.totalActiveSessions ?? 0)}
        </div>
        <span className="text-muted-foreground text-[11px]">Active SSH sessions</span>
      </div>

      <div className="bg-card border-border/80 rounded-lg border p-4">
        <div className="text-muted-foreground flex items-center justify-between">
          <span className="font-mono text-xs font-medium">Reserved Subdomains</span>
          <Globe className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="mt-2 font-mono text-2xl font-bold text-cyan-400">
          {isLoading ? "..." : (analytics?.totalTunnels ?? 0)}
        </div>
        <span className="text-muted-foreground text-[11px]">Custom domain aliases</span>
      </div>

      <div className="bg-card border-border/80 rounded-lg border p-4">
        <div className="text-muted-foreground flex items-center justify-between">
          <span className="font-mono text-xs font-medium">Total Audit Events</span>
          <Activity className="h-4 w-4 text-purple-400" />
        </div>
        <div className="mt-2 font-mono text-2xl font-bold text-purple-400">
          {isLoading ? "..." : (analytics?.totalEvents ?? 0)}
        </div>
        <span className="text-muted-foreground text-[11px]">Connection / disconnect logs</span>
      </div>
    </div>
  );
}
