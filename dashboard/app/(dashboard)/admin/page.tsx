"use client";

import { AdminAnalyticsCards } from "@/components/admin/admin-analytics-cards";
import { useAdminAnalytics } from "@/hooks/use-admin";
import { ArrowUpRight, BarChart3, Layers, Radio } from "lucide-react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const { data: analytics, isLoading } = useAdminAnalytics();

  const activeSessions = analytics?.activeSessionsList ?? [];

  return (
    <div className="space-y-6 font-sans">
      {/* Analytics Top KPI Cards */}
      <AdminAnalyticsCards analytics={analytics} isLoading={isLoading} />

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
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
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
                        className="hover:bg-muted/20 flex items-center justify-between py-2.5 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="rounded border border-emerald-500/20 bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-bold text-emerald-400">
                              {session.subdomain}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {session.remoteIp}
                            </span>
                          </div>
                          <p className="text-muted-foreground font-sans text-xs">
                            {session.userEmail ?? "Anonymous user"}
                          </p>
                        </div>

                        <span className="border-border/60 bg-muted/50 text-muted-foreground rounded border px-2 py-0.5 font-mono text-[10px] font-medium">
                          Active Session
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
              <span className="text-muted-foreground">Historical Audit Events</span>
              <Link
                href="/admin/audit"
                className="text-foreground hover:text-primary inline-flex items-center gap-1 font-semibold transition-colors"
              >
                View Audit Stream <ArrowUpRight className="h-3.5 w-3.5" />
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
