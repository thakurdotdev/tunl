"use client";

import { useMemo, useState } from "react";
import { useAdminAnalytics } from "@/hooks/use-admin";
import { AdminAnalyticsCards } from "@/components/admin/admin-analytics-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Globe,
  Radio,
  Search,
} from "lucide-react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const { data: analytics, isLoading } = useAdminAnalytics();

  // State for Audit Log Search, Filtering, and Pagination
  const [auditSearch, setAuditSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<
    "all" | "tunnel.connected" | "tunnel.disconnected"
  >("all");
  const [auditPage, setAuditPage] = useState(1);
  const pageSize = 8;

  // Filtered audit events
  const filteredEvents = useMemo(() => {
    if (!analytics?.recentEventsList) return [];

    return analytics.recentEventsList.filter((evt) => {
      if (eventTypeFilter !== "all" && evt.eventType !== eventTypeFilter) {
        return false;
      }
      if (auditSearch.trim()) {
        const query = auditSearch.toLowerCase();
        const matchesSubdomain = evt.subdomain?.toLowerCase().includes(query);
        const matchesEmail = evt.userEmail?.toLowerCase().includes(query);
        const matchesType = evt.eventType?.toLowerCase().includes(query);
        const matchesIp = evt.remoteIp?.toLowerCase().includes(query);
        return matchesSubdomain || matchesEmail || matchesType || matchesIp;
      }
      return true;
    });
  }, [analytics?.recentEventsList, eventTypeFilter, auditSearch]);

  const totalFiltered = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(auditPage, totalPages);

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  const handleFilterChange = (filter: "all" | "tunnel.connected" | "tunnel.disconnected") => {
    setEventTypeFilter(filter);
    setAuditPage(1);
  };

  const handleSearchChange = (val: string) => {
    setAuditSearch(val);
    setAuditPage(1);
  };

  const activeSessions = analytics?.activeSessionsList ?? [];

  return (
    <div className="space-y-6">
      {/* Analytics KPI Cards */}
      <AdminAnalyticsCards analytics={analytics} isLoading={isLoading} />

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Live Active Sessions Section (5 cols on lg) */}
        <div className="lg:col-span-5">
          <div className="bg-card/70 border-border/50 flex h-full flex-col justify-between rounded-xl border p-5 shadow-xs backdrop-blur-xs">
            <div>
              <div className="border-border/40 flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                    <Radio className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold">Live Active Tunnels</h3>
                    <p className="text-muted-foreground text-xs">
                      Currently active SSH proxy sessions
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
                </span>
              </div>

              <div className="mt-4">
                {isLoading ? (
                  <div className="text-muted-foreground py-8 text-center text-xs">
                    Loading active sessions...
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="border-border/60 bg-muted/20 mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border">
                      <Radio className="text-muted-foreground/60 h-4 w-4" />
                    </div>
                    <p className="text-muted-foreground text-xs font-medium">
                      No active tunnel sessions
                    </p>
                    <p className="text-muted-foreground/60 mt-0.5 text-[11px]">
                      Live sessions will appear here when connected
                    </p>
                  </div>
                ) : (
                  <div className="divide-border/30 divide-y">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="hover:bg-muted/20 flex items-center justify-between rounded-lg px-1 py-3 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                              {session.subdomain}
                            </span>
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {session.remoteIp}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {session.userEmail ?? "Anonymous user"}
                          </p>
                        </div>

                        <Link
                          href={`/inspect/${session.subdomain}`}
                          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs font-medium transition-colors"
                        >
                          Inspect <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Audit Events Stream (7 cols on lg) */}
        <div className="lg:col-span-7">
          <div className="bg-card/70 border-border/50 flex min-h-[380px] flex-col justify-between rounded-xl border p-5 shadow-xs backdrop-blur-xs">
            <div>
              <div className="border-border/40 flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10">
                    <Activity className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold">System Audit Events</h3>
                    <p className="text-muted-foreground text-xs">
                      Historical connection and event logs
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-400">
                  AUDIT LOG STREAM
                </span>
              </div>

              {/* Controls: Search & Filter Tabs */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
                  <Input
                    type="text"
                    placeholder="Search subdomain, email, or IP..."
                    value={auditSearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="bg-muted/20 border-border/60 h-8 pl-8 text-xs"
                  />
                </div>

                <div className="border-border/50 bg-muted/30 flex items-center gap-1 rounded-lg border p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleFilterChange("all")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      eventTypeFilter === "all"
                        ? "bg-card text-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange("tunnel.connected")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      eventTypeFilter === "tunnel.connected"
                        ? "bg-card font-semibold text-emerald-400 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Connected
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange("tunnel.disconnected")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      eventTypeFilter === "tunnel.disconnected"
                        ? "bg-card font-semibold text-rose-400 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Disconnected
                  </button>
                </div>
              </div>

              {/* Audit Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="border-border/50 bg-muted/20 text-muted-foreground border-b text-[10px] font-medium tracking-wider uppercase">
                    <tr>
                      <th className="px-2 py-2">Event</th>
                      <th className="px-2 py-2">Subdomain</th>
                      <th className="px-2 py-2">User</th>
                      <th className="px-2 py-2">Remote IP</th>
                      <th className="px-2 py-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/30 divide-y">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="text-muted-foreground py-10 text-center text-xs">
                          Loading audit logs...
                        </td>
                      </tr>
                    ) : paginatedEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="text-muted-foreground flex flex-col items-center justify-center gap-1">
                            <Activity className="mb-1 h-5 w-5 opacity-40" />
                            <span className="text-xs font-medium">
                              No audit events match current criteria
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedEvents.map((evt) => {
                        const isConnected = evt.eventType === "tunnel.connected";
                        return (
                          <tr key={evt.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-2 py-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  isConnected
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                    : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isConnected ? "animate-pulse bg-emerald-400" : "bg-rose-400"
                                  }`}
                                />
                                {isConnected ? "connected" : "disconnected"}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {evt.subdomain ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan-400">
                                  <Globe className="h-3 w-3 shrink-0 opacity-70" />
                                  <span className="max-w-[90px] truncate">{evt.subdomain}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <span
                                className="text-muted-foreground block max-w-[130px] truncate"
                                title={evt.userEmail ?? "Anonymous"}
                              >
                                {evt.userEmail ?? (
                                  <span className="text-muted-foreground/60 italic">Anonymous</span>
                                )}
                              </span>
                            </td>
                            <td className="text-muted-foreground px-2 py-2 font-mono text-[11px]">
                              {evt.remoteIp ?? <span className="text-muted-foreground/40">-</span>}
                            </td>
                            <td className="text-muted-foreground px-2 py-2 text-right font-mono text-[11px] whitespace-nowrap">
                              {new Date(evt.occurredAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalFiltered > 0 && (
              <div className="border-border/50 mt-5 flex items-center justify-between border-t pt-3.5 text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Showing{" "}
                  <span className="text-foreground font-semibold">
                    {(currentPage - 1) * pageSize + 1}
                  </span>
                  –
                  <span className="text-foreground font-semibold">
                    {Math.min(currentPage * pageSize, totalFiltered)}
                  </span>{" "}
                  of <span className="text-foreground font-semibold">{totalFiltered}</span> logs
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2.5 text-[11px] font-medium"
                  >
                    <ChevronLeft className="mr-0.5 h-3 w-3" /> Prev
                  </Button>

                  <span className="text-muted-foreground px-1 text-[11px] font-medium">
                    {currentPage} / {totalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAuditPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-7 px-2.5 text-[11px] font-medium"
                  >
                    Next <ChevronRight className="ml-0.5 h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Insights Grid: Traffic Conversion & Plan Quota Saturation */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traffic & Session Type Analytics */}
        <div className="bg-card/70 border-border/50 rounded-xl border p-5 shadow-xs backdrop-blur-xs">
          <div className="border-border/40 flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                Traffic & Conversion Analytics
              </h3>
              <p className="text-muted-foreground text-xs">
                Anonymous device usage vs. authenticated user sessions
              </p>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-400">
              USAGE INSIGHTS
            </span>
          </div>

          <div className="mt-4 space-y-4 text-xs">
            {/* Authenticated vs Anonymous Sessions Progress Bar */}
            <div>
              <div className="text-muted-foreground mb-1.5 flex justify-between text-[11px] font-medium">
                <span>Authenticated Sessions ({analytics?.totalAuthEvents ?? 0})</span>
                <span>Anonymous Device Sessions ({analytics?.totalAnonEvents ?? 0})</span>
              </div>
              {(() => {
                const auth = analytics?.totalAuthEvents ?? 0;
                const anon = analytics?.totalAnonEvents ?? 0;
                const total = auth + anon;
                const authPct = total > 0 ? Math.round((auth / total) * 100) : 50;
                return (
                  <div className="bg-muted/40 flex h-2 w-full overflow-hidden rounded-full">
                    <div
                      style={{ width: `${authPct}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                    />
                    <div
                      style={{ width: `${100 - authPct}%` }}
                      className="bg-purple-500 transition-all duration-500"
                    />
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="border-border/40 bg-muted/20 rounded-lg border p-3">
                <span className="text-muted-foreground block text-[11px] font-medium">
                  Anonymous Accounts Converted
                </span>
                <span className="text-foreground mt-0.5 block text-lg font-bold">
                  {isLoading ? "..." : (analytics?.totalLinkedIdentities ?? 0)}
                </span>
                <span className="text-muted-foreground/70 text-[10px]">Linked device IDs</span>
              </div>

              <div className="border-border/40 bg-muted/20 rounded-lg border p-3">
                <span className="text-muted-foreground block text-[11px] font-medium">
                  Total Audit Events Streamed
                </span>
                <span className="text-foreground mt-0.5 block text-lg font-bold">
                  {isLoading ? "..." : (analytics?.totalEvents ?? 0)}
                </span>
                <span className="text-muted-foreground/70 text-[10px]">PostgreSQL log entries</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plan Quotas & Distribution */}
        <div className="bg-card/70 border-border/50 rounded-xl border p-5 shadow-xs backdrop-blur-xs">
          <div className="border-border/40 flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                Subscription Plan Tier Utilization
              </h3>
              <p className="text-muted-foreground text-xs">
                User count and resource quota caps per tier
              </p>
            </div>
            <span className="border-primary/30 bg-primary/10 text-primary rounded-full border px-2.5 py-0.5 text-[10px] font-semibold">
              QUOTA CAPS
            </span>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            {isLoading ? (
              <div className="text-muted-foreground py-6 text-center">
                Loading plan statistics...
              </div>
            ) : analytics?.planDistribution.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center">
                No subscription plans found.
              </div>
            ) : (
              analytics?.planDistribution.map((plan) => (
                <div
                  key={plan.planName}
                  className="border-border/40 bg-muted/20 hover:bg-muted/30 flex items-center justify-between rounded-lg border p-3 transition-colors"
                >
                  <div>
                    <span className="text-foreground text-xs font-semibold capitalize">
                      {plan.planName} Tier
                    </span>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-[11px]">
                      <span>
                        Max Subdomains:{" "}
                        <strong className="text-foreground">{plan.maxSubdomains ?? 1}</strong>
                      </span>
                      <span>
                        Max Active Tunnels:{" "}
                        <strong className="text-foreground">{plan.maxActiveTunnels ?? 1}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-primary text-sm font-bold">{plan.userCount}</span>
                    <span className="text-muted-foreground block text-[10px]">users</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
