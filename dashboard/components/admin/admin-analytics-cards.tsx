import type { AdminAnalytics } from "@/lib/types";
import { Activity, Globe, Radio, Users } from "lucide-react";

interface AdminAnalyticsCardsProps {
  analytics: AdminAnalytics | undefined;
  isLoading: boolean;
}

export function AdminAnalyticsCards({ analytics, isLoading }: AdminAnalyticsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-sans">
      <div className="bg-card border-border/60 rounded-lg border p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">Total Registered Users</span>
          <div className="bg-secondary text-foreground flex h-8 w-8 items-center justify-center rounded-md border border-border/60">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="text-foreground mt-2 text-2xl font-bold tracking-tight">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse text-lg">...</span>
          ) : (
            (analytics?.totalUsers ?? 0)
          )}
        </div>
        <span className="text-muted-foreground mt-1 block text-xs">Accounts in database</span>
      </div>

      <div className="bg-card border-border/60 rounded-lg border p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">Active Live Tunnels</span>
          <div className="bg-emerald-500/15 text-emerald-400 flex h-8 w-8 items-center justify-center rounded-md border border-emerald-500/20">
            <Radio className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse text-lg">...</span>
          ) : (
            (analytics?.totalActiveSessions ?? 0)
          )}
        </div>
        <span className="text-muted-foreground mt-1 block text-xs">Active SSH sessions</span>
      </div>

      <div className="bg-card border-border/60 rounded-lg border p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">Reserved Subdomains</span>
          <div className="bg-secondary text-foreground flex h-8 w-8 items-center justify-center rounded-md border border-border/60">
            <Globe className="h-4 w-4" />
          </div>
        </div>
        <div className="text-foreground mt-2 text-2xl font-bold tracking-tight">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse text-lg">...</span>
          ) : (
            (analytics?.totalTunnels ?? 0)
          )}
        </div>
        <span className="text-muted-foreground mt-1 block text-xs">Custom domain aliases</span>
      </div>

      <div className="bg-card border-border/60 rounded-lg border p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">Total Audit Events</span>
          <div className="bg-secondary text-foreground flex h-8 w-8 items-center justify-center rounded-md border border-border/60">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="text-foreground mt-2 text-2xl font-bold tracking-tight">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse text-lg">...</span>
          ) : (
            (analytics?.totalEvents ?? 0)
          )}
        </div>
        <span className="text-muted-foreground mt-1 block text-xs">
          Connection & disconnect logs
        </span>
      </div>
    </div>
  );
}
