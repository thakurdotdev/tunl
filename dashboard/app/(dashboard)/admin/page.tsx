"use client";

import { useAdminAnalytics } from "@/hooks/use-admin";
import { AdminAnalyticsCards } from "@/components/admin/admin-analytics-cards";
import { Button } from "@/components/ui/button";
import { Users, Layers, ArrowRight, Radio, Activity, Globe, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const { data: analytics, isLoading } = useAdminAnalytics();

  return (
    <div className="space-y-6 font-mono">
      {/* Analytics KPI Cards */}
      <AdminAnalyticsCards analytics={analytics} isLoading={isLoading} />

      {/* Live Active Tunnels & Audit Events Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Tunnels Table */}
        <div className="bg-card border-border/80 flex flex-col justify-between rounded-lg border p-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Live Active Tunnels</h3>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                ● LIVE SESSIONS
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Currently connected SSH tunnel connections and active proxies.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border/60 bg-muted/30 text-muted-foreground border-b">
                  <tr>
                    <th className="px-2.5 py-2 font-medium">Subdomain</th>
                    <th className="px-2.5 py-2 font-medium">User Email</th>
                    <th className="px-2.5 py-2 font-medium">Remote IP</th>
                    <th className="px-2.5 py-2 font-medium">Connected</th>
                    <th className="px-2.5 py-2 text-right font-medium">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-border/40 divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="text-muted-foreground py-6 text-center">
                        Loading active sessions...
                      </td>
                    </tr>
                  ) : analytics?.activeSessionsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-muted-foreground py-6 text-center">
                        No active tunnel sessions currently running.
                      </td>
                    </tr>
                  ) : (
                    analytics?.activeSessionsList.map((session) => (
                      <tr key={session.id} className="hover:bg-muted/20">
                        <td className="px-2.5 py-2">
                          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-400">
                            {session.subdomain}
                          </span>
                        </td>
                        <td className="text-foreground px-2.5 py-2 font-medium">
                          {session.userEmail ?? (
                            <span className="text-muted-foreground italic">Anonymous</span>
                          )}
                        </td>
                        <td className="text-muted-foreground px-2.5 py-2 font-mono text-[11px]">
                          {session.remoteIp}
                        </td>
                        <td className="text-muted-foreground px-2.5 py-2 text-[11px]">
                          {new Date(session.connectedAt).toLocaleTimeString()}
                        </td>
                        <td className="px-2.5 py-2 text-right">
                          <Link
                            href={`/inspect/${session.subdomain}`}
                            className="text-muted-foreground hover:text-primary inline-flex items-center text-[11px]"
                          >
                            Live <ArrowUpRight className="ml-0.5 h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Events Log Stream Table */}
        <div className="bg-card border-border/80 flex flex-col justify-between rounded-lg border p-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold">Recent System Audit Events</h3>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                AUDIT LOG STREAM
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Append-only historical tunnel event stream from PostgreSQL.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border/60 bg-muted/30 text-muted-foreground border-b">
                  <tr>
                    <th className="px-2.5 py-2 font-medium">Event Type</th>
                    <th className="px-2.5 py-2 font-medium">Subdomain</th>
                    <th className="px-2.5 py-2 font-medium">User Email</th>
                    <th className="px-2.5 py-2 text-right font-medium">Occurred At</th>
                  </tr>
                </thead>
                <tbody className="divide-border/40 divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground py-6 text-center">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : analytics?.recentEventsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground py-6 text-center">
                        No historical events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    analytics?.recentEventsList.map((evt) => (
                      <tr key={evt.id} className="hover:bg-muted/20">
                        <td className="px-2.5 py-2">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                              evt.eventType === "tunnel.connected"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {evt.eventType}
                          </span>
                        </td>
                        <td className="text-foreground px-2.5 py-2 font-medium">
                          {evt.subdomain ? (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Globe className="h-3 w-3 opacity-60" /> {evt.subdomain}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                        </td>
                        <td className="text-muted-foreground px-2.5 py-2">
                          {evt.userEmail ?? (
                            <span className="text-muted-foreground/60 italic">Anonymous</span>
                          )}
                        </td>
                        <td className="text-muted-foreground px-2.5 py-2 text-right text-[11px]">
                          {new Date(evt.occurredAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-card border-border/80 rounded-lg border p-5">
          <div className="flex items-center gap-2">
            <Users className="text-primary h-5 w-5" />
            <h3 className="text-sm font-bold">User Account Directory</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Filter user accounts, assign custom subscription tiers, and manage administrative
            privileges.
          </p>
          <Link href="/admin/users" className="mt-4 inline-block">
            <Button size="sm" variant="outline" className="border-border text-xs">
              Manage Users <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="bg-card border-border/80 rounded-lg border p-5">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-bold">Plan Tiers & Quotas</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Configure system plan tiers, inspect resource caps, and define new subscription options.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link href="/admin/plans">
              <Button size="sm" variant="outline" className="border-border text-xs">
                View Plans <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/admin/plans/new">
              <Button size="sm" className="text-xs">
                + Create Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
