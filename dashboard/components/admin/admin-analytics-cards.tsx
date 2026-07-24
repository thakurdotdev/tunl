import type { AdminAnalytics } from "@/lib/types";
import { Activity, Globe, Radio, Users } from "lucide-react";

interface AdminAnalyticsCardsProps {
  analytics: AdminAnalytics | undefined;
  isLoading: boolean;
}

export function AdminAnalyticsCards({ analytics, isLoading }: AdminAnalyticsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-card/70 border-border/50 hover:border-border/80 rounded-xl border p-4.5 shadow-xs backdrop-blur-xs transition-all">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">Total Registered Users</span>
          <div className="border-primary/20 bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg border">
            <Users className="text-primary h-4 w-4" />
          </div>
        </div>
        <div className="text-foreground mt-3 text-2xl font-bold tracking-tight">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse text-lg">...</span>
          ) : (
            (analytics?.totalUsers ?? 0)
          )}
        </div>
        <span className="text-muted-foreground mt-1 block text-[11px]">Accounts in database</span>
      </div>

      <div className="bg-card/70 border-border/50 hover:border-border/80 rounded-xl border p-4.5 shadow-xs backdrop-blur-xs transition-all">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">Active Live Tunnels</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
            <Radio className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight text-emerald-400">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse text-lg">...</span>
          ) : (
            (analytics?.totalActiveSessions ?? 0)
          )}
        </div>
        <span className="text-muted-foreground mt-1 block text-[11px]">Active SSH sessions</span>
      </div>

      <div className="bg-card/70 border-border/50 hover:border-border/80 rounded-xl border p-4.5 shadow-xs backdrop-blur-xs transition-all">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">Reserved Subdomains</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
            <Globe className="h-4 w-4 text-cyan-400" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight text-cyan-400">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse text-lg">...</span>
          ) : (
            (analytics?.totalTunnels ?? 0)
          )}
        </div>
        <span className="text-muted-foreground mt-1 block text-[11px]">Custom domain aliases</span>
      </div>

      <div className="bg-card/70 border-border/50 hover:border-border/80 rounded-xl border p-4.5 shadow-xs backdrop-blur-xs transition-all">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">Total Audit Events</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10">
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight text-purple-400">
          {isLoading ? (
            <span className="text-muted-foreground animate-pulse text-lg">...</span>
          ) : (
            (analytics?.totalEvents ?? 0)
          )}
        </div>
        <span className="text-muted-foreground mt-1 block text-[11px]">
          Connection & disconnect logs
        </span>
      </div>
    </div>
  );
}
