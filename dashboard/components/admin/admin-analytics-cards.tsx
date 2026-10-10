import type { AdminAnalytics } from "@/lib/types";
import { Activity, Globe, Radio, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AdminAnalyticsCardsProps {
  analytics: AdminAnalytics | undefined;
  isLoading: boolean;
}

export function AdminAnalyticsCards({ analytics, isLoading }: AdminAnalyticsCardsProps) {
  const metrics = [
    {
      label: "Registered users",
      value: analytics?.totalUsers ?? 0,
      description: "Accounts in database",
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
      description: "Connection and disconnect logs",
      icon: Activity,
    },
  ];

  return (
    <div className="grid gap-4 font-sans sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, description, icon: Icon, highlight }) => (
        <Card key={label} className="gap-0 p-4 shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-md border ${
                  highlight
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-border/60 bg-secondary text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <div
              className={`mt-3 text-2xl font-semibold tracking-tight ${highlight ? "text-emerald-400" : "text-foreground"}`}
            >
              {isLoading ? <span className="animate-pulse text-muted-foreground">—</span> : value.toLocaleString()}
            </div>
            <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
