import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { tunnelBandwidth, tunnels } from "../../db/schema.js";

export type MetricItem = {
  subdomain: string;
  requestCount: number;
  bytesIn: number;
  bytesOut: number;
  errorCount: number;
  totalDurationMs: number;
};

export async function recordRequestMetrics(db: Database, metrics: MetricItem[]) {
  if (!metrics || metrics.length === 0) return;

  const now = new Date();
  const bucketStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0),
  );

  const subdomains = [...new Set(metrics.map((m) => m.subdomain))];
  const userRows = await db
    .select({ subdomain: tunnels.subdomain, userId: tunnels.userId })
    .from(tunnels)
    .where(inArray(tunnels.subdomain, subdomains));

  const userMap = new Map<string, string>();
  for (const row of userRows) {
    userMap.set(row.subdomain, row.userId);
  }

  for (const m of metrics) {
    if (!m.subdomain) continue;
    const userId = userMap.get(m.subdomain) ?? null;

    await db
      .insert(tunnelBandwidth)
      .values({
        subdomain: m.subdomain,
        userId,
        requestCount: m.requestCount,
        bytesIn: m.bytesIn,
        bytesOut: m.bytesOut,
        errorCount: m.errorCount,
        totalDurationMs: m.totalDurationMs,
        bucketStart,
      })
      .onConflictDoUpdate({
        target: [tunnelBandwidth.subdomain, tunnelBandwidth.bucketStart],
        set: {
          requestCount: sql`${tunnelBandwidth.requestCount} + ${m.requestCount}`,
          bytesIn: sql`${tunnelBandwidth.bytesIn} + ${m.bytesIn}`,
          bytesOut: sql`${tunnelBandwidth.bytesOut} + ${m.bytesOut}`,
          errorCount: sql`${tunnelBandwidth.errorCount} + ${m.errorCount}`,
          totalDurationMs: sql`${tunnelBandwidth.totalDurationMs} + ${m.totalDurationMs}`,
        },
      });
  }
}

export async function getSubdomainAnalytics(
  db: Database,
  subdomain: string,
  period: "24h" | "7d" | "30d" = "24h",
) {
  const now = Date.now();
  const periodHours = period === "30d" ? 30 * 24 : period === "7d" ? 7 * 24 : 24;
  const since = new Date(now - periodHours * 60 * 60 * 1000);

  const buckets = await db
    .select({
      id: tunnelBandwidth.id,
      subdomain: tunnelBandwidth.subdomain,
      requestCount: tunnelBandwidth.requestCount,
      bytesIn: tunnelBandwidth.bytesIn,
      bytesOut: tunnelBandwidth.bytesOut,
      errorCount: tunnelBandwidth.errorCount,
      totalDurationMs: tunnelBandwidth.totalDurationMs,
      bucketStart: tunnelBandwidth.bucketStart,
    })
    .from(tunnelBandwidth)
    .where(and(eq(tunnelBandwidth.subdomain, subdomain), gte(tunnelBandwidth.bucketStart, since)))
    .orderBy(asc(tunnelBandwidth.bucketStart));

  let totalRequests = 0;
  let totalBytesIn = 0;
  let totalBytesOut = 0;
  let totalErrors = 0;
  let totalDurationMs = 0;

  const timeSeries = buckets.map((b) => {
    totalRequests += b.requestCount;
    totalBytesIn += b.bytesIn;
    totalBytesOut += b.bytesOut;
    totalErrors += b.errorCount;
    totalDurationMs += b.totalDurationMs;

    const avgDurationMs = b.requestCount > 0 ? Math.round(b.totalDurationMs / b.requestCount) : 0;
    const errorRate = b.requestCount > 0 ? +((b.errorCount / b.requestCount) * 100).toFixed(1) : 0;

    return {
      bucketStart: b.bucketStart.toISOString(),
      requestCount: b.requestCount,
      bytesIn: b.bytesIn,
      bytesOut: b.bytesOut,
      errorCount: b.errorCount,
      avgDurationMs,
      errorRate,
    };
  });

  const avgDurationMs = totalRequests > 0 ? Math.round(totalDurationMs / totalRequests) : 0;
  const errorRate = totalRequests > 0 ? +((totalErrors / totalRequests) * 100).toFixed(1) : 0;

  return {
    subdomain,
    period,
    summary: {
      totalRequests,
      totalBytesIn,
      totalBytesOut,
      totalErrors,
      avgDurationMs,
      errorRate,
    },
    timeSeries,
  };
}
