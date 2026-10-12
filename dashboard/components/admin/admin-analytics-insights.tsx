"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { countryFlagUrl, countryName } from "@/lib/utils";
import Image from "next/image";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AdminGeoAnalytics, AdminGrowthAnalytics, AdminSessionAnalytics } from "@/lib/types";

function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function AdminAnalyticsInsights({
  growth,
  geo,
  sessions,
}: {
  growth: UseQueryResult<AdminGrowthAnalytics>;
  geo: UseQueryResult<AdminGeoAnalytics>;
  sessions: UseQueryResult<AdminSessionAnalytics>;
}) {
  const countries = geo.data?.countries.slice(0, 10) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="gap-4 p-5 shadow-none">
        <div>
          <h3 className="text-sm font-semibold">User growth · 30 days</h3>
          <p className="text-muted-foreground text-xs">Daily signups · UTC calendar days</p>
        </div>
        {growth.isPending ? (
          <p className="text-muted-foreground py-12 text-center text-xs">Loading signup trend...</p>
        ) : growth.isError ? (
          <p role="alert" className="text-destructive text-sm">
            Unable to load signup trend.
          </p>
        ) : (
          <>
            <p className="text-2xl font-semibold">
              {growth.data.days.reduce((total, day) => total + day.signups, 0).toLocaleString()}{" "}
              <span className="text-muted-foreground text-xs font-normal">signups</span>
            </p>
            <div
              className="h-44 w-full"
              aria-label="Daily registered user signups for the last 30 UTC days"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={growth.data.days}
                  margin={{ top: 5, right: 5, bottom: 0, left: -25 }}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(day: string) => day.slice(5)}
                    minTickGap={35}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    name="Signups"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        <div className="border-border/60 border-t pt-4">
          <h4 className="text-xs font-semibold">Session duration · last 24h</h4>
          {sessions.isError ? (
            <p role="alert" className="text-destructive mt-2 text-xs">
              Unable to load session insights.
            </p>
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-muted-foreground text-xs">Average</dt>
                  <dd className="mt-1 font-mono text-lg">
                    {formatDuration(sessions.data?.avgSessionDurationMs)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Median</dt>
                  <dd className="mt-1 font-mono text-lg">
                    {formatDuration(sessions.data?.medianSessionDurationMs)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Observed peak</dt>
                  <dd className="mt-1 font-mono text-lg">
                    {sessions.data?.peakConcurrentTunnelsLast24h ?? "—"}
                  </dd>
                </div>
              </dl>
              <p className="text-muted-foreground mt-2 text-[11px]">
                {sessions.isPending
                  ? "Loading completed sessions..."
                  : `${sessions.data?.completedSessions ?? 0} completed sessions. Peak is derived from recorded events and tracked live sessions.`}
              </p>
            </>
          )}
        </div>
      </Card>
      <Card className="gap-4 p-5 shadow-none">
        <div>
          <h3 className="text-sm font-semibold">Geographic activity · last 24h</h3>
          <p className="text-muted-foreground text-xs">
            {geo.data
              ? `${geo.data.uniqueIpsLast24h.toLocaleString()} unique IPs · top 10 countries by connections`
              : "Top countries by connections"}
          </p>
        </div>
        {geo.isPending ? (
          <p className="text-muted-foreground py-12 text-center text-xs">
            Loading geographic activity...
          </p>
        ) : geo.isError ? (
          <p role="alert" className="text-destructive text-sm">
            Unable to load geographic activity.
          </p>
        ) : countries.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-xs">
            No geolocated connections in this window.
          </p>
        ) : (
          <ol className="space-y-3">
            {countries.map((country, index) => (
              <li key={country.country}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{index + 1}</span>
                    {countryFlagUrl(country.country) && (
                      <Image
                        unoptimized
                        width={16}
                        height={12}
                        src={countryFlagUrl(country.country, 16)!}
                        alt=""
                        className="h-3 w-4 rounded-[1px]"
                      />
                    )}
                    {countryName(country.country) ?? country.country}
                  </span>
                  <span className="font-mono">
                    {country.sessionCount.toLocaleString()}{" "}
                    <span className="text-muted-foreground">
                      · {country.uniqueDevices} identities
                    </span>
                  </span>
                </div>
                <div className="bg-muted h-1.5 rounded-full">
                  <div
                    className="bg-primary/70 h-full rounded-full"
                    style={{
                      width: `${(country.sessionCount / countries[0].sessionCount) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
