import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import {
  activeTunnelSessions,
  customDomains,
  identityLinks,
  plans,
  sshKeys,
  tunnelBandwidth,
  tunnelEvents,
  tunnels,
  user,
} from "../../db/schema.js";
import { badRequest, conflict, notFound } from "../../platform/errors.js";
import { cachedAnalytics } from "./analytics-cache.js";

export async function getAdminAnalytics(db: Database) {
  const [overview, engagement, sessions] = await Promise.all([
    getAdminOverviewAnalytics(db),
    getAdminUserAnalytics(db),
    getAdminSessionAnalytics(db),
  ]);
  return {
    ...overview,
    ...engagement,
    ...sessions,
    totalLinkedIdentities: engagement.totalLinkedIdentities,
  };
}

export function getAdminOverviewAnalytics(db: Database) {
  return cachedAnalytics(db, "overview", 30_000, async () => {
    const [[totals], planDistribution] = await Promise.all([
      db.execute(sql`SELECT
        (SELECT count(*)::int FROM "user") AS "totalUsers",
        (SELECT count(*)::int FROM active_tunnel_sessions) AS "totalActiveSessions",
        t.total_tunnels AS "totalTunnels",
        t.active_tunnels_30d AS "activeTunnelsLast30d",
        (SELECT count(*)::int FROM custom_domains) AS "totalCustomDomains",
        (SELECT count(*)::int FROM tunnel_events) AS "totalEvents"
      FROM (
        SELECT
          count(*)::int AS total_tunnels,
          count(*) FILTER (WHERE last_connected_at >= now() - interval '30 days')::int AS active_tunnels_30d
        FROM tunnels
      ) t`),
      db
        .select({
          planName: plans.name,
          userCount: count(user.id),
          maxSubdomains: plans.maxReservedSubdomains,
          maxActiveTunnels: plans.maxActiveTunnels,
        })
        .from(plans)
        .leftJoin(user, eq(user.planId, plans.id))
        .groupBy(plans.id, plans.name, plans.maxReservedSubdomains, plans.maxActiveTunnels),
    ]);
    return {
      totalUsers: Number(totals.totalUsers),
      totalActiveSessions: Number(totals.totalActiveSessions),
      totalTunnels: Number(totals.totalTunnels),
      activeTunnelsLast30d: Number(totals.activeTunnelsLast30d ?? 0),
      totalCustomDomains: Number(totals.totalCustomDomains),
      totalEvents: Number(totals.totalEvents),
      planDistribution,
    };
  });
}

export function getAdminUserAnalytics(db: Database) {
  return cachedAnalytics(db, "engagement", 60_000, async () => {
    const [[signups], [activity], [conversion], recentConversions] = await Promise.all([
      db.execute(sql`SELECT
        count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS "newUsersLast24h",
        count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS "newUsersLast7d",
        count(*)::int AS "newUsersLast30d"
        FROM "user" WHERE created_at >= now() - interval '30 days' AND created_at <= now()`),
      db.execute(sql`SELECT
        count(DISTINCT user_id) FILTER (WHERE occurred_at >= now() - interval '24 hours')::int AS "dauCount",
        count(DISTINCT user_id) FILTER (WHERE occurred_at >= now() - interval '7 days')::int AS "wauCount",
        count(DISTINCT user_id)::int AS "mauCount"
        FROM tunnel_events WHERE user_id IS NOT NULL
          AND occurred_at >= now() - interval '30 days' AND occurred_at <= now()`),
      db.execute(sql`WITH devices AS (
        SELECT DISTINCT anonymous_id FROM tunnel_events
        WHERE user_id IS NULL AND anonymous_id IS NOT NULL AND anonymous_id <> ''
          AND event_type = 'tunnel.connected' AND occurred_at <= now()
      ) SELECT
        (SELECT count(DISTINCT user_id)::int FROM identity_links) AS "totalConversions",
        (SELECT count(*)::int FROM identity_links) AS "totalLinkedIdentities",
        count(*)::int AS "uniqueAnonymousDevices",
        count(identity_links.anonymous_id)::int AS "convertedAnonymousDevices"
        FROM devices LEFT JOIN identity_links USING (anonymous_id)`),
      db
        .select({
          anonymousId: identityLinks.anonymousId,
          userId: identityLinks.userId,
          userEmail: user.email,
          linkedAt: identityLinks.linkedAt,
        })
        .from(identityLinks)
        .innerJoin(user, eq(identityLinks.userId, user.id))
        .orderBy(desc(identityLinks.linkedAt))
        .limit(5),
    ]);
    const uniqueAnonymousDevices = Number(conversion.uniqueAnonymousDevices);
    return {
      newUsersLast24h: Number(signups.newUsersLast24h),
      newUsersLast7d: Number(signups.newUsersLast7d),
      newUsersLast30d: Number(signups.newUsersLast30d),
      dauCount: Number(activity.dauCount),
      wauCount: Number(activity.wauCount),
      mauCount: Number(activity.mauCount),
      totalConversions: Number(conversion.totalConversions),
      totalLinkedIdentities: Number(conversion.totalLinkedIdentities),
      uniqueAnonymousDevices,
      conversionRate:
        uniqueAnonymousDevices > 0
          ? Number(
              (
                (Number(conversion.convertedAnonymousDevices) / uniqueAnonymousDevices) *
                100
              ).toFixed(1),
            )
          : 0,
      recentConversions,
    };
  });
}

export function getAdminGrowthAnalytics(db: Database) {
  return cachedAnalytics(db, "growth", 300_000, async () => {
    const days = await db.execute(sql`WITH days AS (
      SELECT generate_series((now() AT TIME ZONE 'UTC')::date - 29,
        (now() AT TIME ZONE 'UTC')::date, interval '1 day') AS day
    ), signups AS (
      SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS signups
      FROM "user" WHERE created_at >= (((now() AT TIME ZONE 'UTC')::date - 29) AT TIME ZONE 'UTC')
        AND created_at <= now() GROUP BY 1
    ) SELECT to_char(days.day, 'YYYY-MM-DD') AS day, COALESCE(signups.signups, 0)::int AS signups
      FROM days LEFT JOIN signups ON days.day = signups.day ORDER BY days.day`);
    return { days: days.map((row) => ({ day: String(row.day), signups: Number(row.signups) })) };
  });
}

export function getAdminGeoAnalytics(db: Database) {
  return cachedAnalytics(db, "geo", 120_000, async () => {
    const [[ips], countries] = await Promise.all([
      db.execute(sql`SELECT count(DISTINCT NULLIF(COALESCE(properties->>'remoteIp', properties->>'remote_ip'), ''))::int AS count
        FROM tunnel_events WHERE occurred_at >= now() - interval '24 hours' AND occurred_at <= now()`),
      db.execute(sql`SELECT upper(properties->>'country') AS country, count(*)::int AS "sessionCount",
        count(DISTINCT CASE WHEN user_id IS NOT NULL THEN 'user:' || user_id
          ELSE 'anon:' || NULLIF(anonymous_id, '') END)::int AS "uniqueDevices"
        FROM tunnel_events WHERE occurred_at >= now() - interval '24 hours' AND occurred_at <= now()
          AND event_type = 'tunnel.connected' AND properties->>'country' IS NOT NULL
          AND properties->>'country' <> ''
        GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 15`),
    ]);
    return {
      uniqueIpsLast24h: Number(ips.count),
      countries: countries.map((row) => ({
        country: String(row.country),
        sessionCount: Number(row.sessionCount),
        uniqueDevices: Number(row.uniqueDevices),
      })),
    };
  });
}

export function getAdminSessionAnalytics(db: Database) {
  return cachedAnalytics(db, "sessions", 15_000, async () => {
    // Seed the rolling concurrency window with completed sessions whose durations
    // cross its boundary and tracked authenticated sessions still connected.
    // Long-lived anonymous sessions with no disconnect/heartbeat are not observable
    // in the operational table, so this metric is an observed peak, not a live census.
    const [[metrics], activeSessionsList, recentEventsList, eventTypeCounts] = await Promise.all([
      db.execute(sql`WITH recent AS (
        SELECT *, CASE WHEN event_type = 'tunnel.disconnected'
          AND properties->>'durationMs' ~ '^[0-9]{1,16}$'
          THEN (properties->>'durationMs')::double precision END AS duration
        FROM tunnel_events WHERE occurred_at >= now() - interval '24 hours' AND occurred_at <= now()
      ), deltas AS (
        SELECT occurred_at, sum(CASE WHEN event_type = 'tunnel.connected' THEN 1 ELSE -1 END) AS delta
        FROM recent GROUP BY occurred_at
      ), baseline AS (
        SELECT (SELECT count(*) FROM recent WHERE duration IS NOT NULL
          AND occurred_at - duration * interval '1 millisecond' < now() - interval '24 hours')
          + (SELECT count(*) FROM active_tunnel_sessions WHERE connected_at < now() - interval '24 hours') AS count
      ) SELECT
        count(*) FILTER (WHERE event_type = 'tunnel.connected' AND user_id IS NOT NULL)::int AS "totalAuthEvents",
        count(*) FILTER (WHERE event_type = 'tunnel.connected' AND user_id IS NULL)::int AS "totalAnonEvents",
        avg(duration) AS "avgSessionDurationMs",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS "medianSessionDurationMs",
        count(duration)::int AS "completedSessions",
        (SELECT count(*)::int FROM active_tunnel_sessions) AS "totalActiveSessions",
        GREATEST((SELECT count FROM baseline), COALESCE((SELECT max(concurrent) FROM (
          SELECT (SELECT count FROM baseline) + sum(delta) OVER (ORDER BY occurred_at) AS concurrent FROM deltas
        ) peaks), 0))::int AS "peakConcurrentTunnelsLast24h"
        FROM recent`),
      db
        .select({
          id: activeTunnelSessions.id,
          subdomain: activeTunnelSessions.subdomain,
          remoteIp: activeTunnelSessions.remoteIp,
          country: activeTunnelSessions.country,
          city: activeTunnelSessions.city,
          connectedAt: activeTunnelSessions.connectedAt,
          userEmail: user.email,
        })
        .from(activeTunnelSessions)
        .leftJoin(user, eq(activeTunnelSessions.userId, user.id))
        .orderBy(desc(activeTunnelSessions.connectedAt))
        .limit(20),
      db
        .select({
          id: tunnelEvents.id,
          eventType: tunnelEvents.eventType,
          properties: tunnelEvents.properties,
          occurredAt: tunnelEvents.occurredAt,
          userEmail: user.email,
        })
        .from(tunnelEvents)
        .leftJoin(user, eq(tunnelEvents.userId, user.id))
        .orderBy(desc(tunnelEvents.occurredAt))
        .limit(5),
      db
        .select({ eventType: tunnelEvents.eventType, eventCount: count() })
        .from(tunnelEvents)
        .where(
          and(
            gte(tunnelEvents.occurredAt, new Date(Date.now() - 86_400_000)),
            sql`${tunnelEvents.occurredAt} <= now()`,
          ),
        )
        .groupBy(tunnelEvents.eventType),
    ]);
    return {
      totalAuthEvents: Number(metrics.totalAuthEvents),
      totalAnonEvents: Number(metrics.totalAnonEvents),
      totalActiveSessions: Number(metrics.totalActiveSessions),
      completedSessions: Number(metrics.completedSessions),
      avgSessionDurationMs:
        metrics.avgSessionDurationMs == null ? null : Number(metrics.avgSessionDurationMs),
      medianSessionDurationMs:
        metrics.medianSessionDurationMs == null ? null : Number(metrics.medianSessionDurationMs),
      peakConcurrentTunnelsLast24h: Number(metrics.peakConcurrentTunnelsLast24h),
      activeSessionsList,
      recentEventsList: recentEventsList.map((event) => {
        const props = event.properties as Record<string, unknown>;
        return {
          ...event,
          subdomain: props.subdomain ? String(props.subdomain) : null,
          remoteIp:
            props.remoteIp || props.remote_ip ? String(props.remoteIp || props.remote_ip) : null,
        };
      }),
      eventTypeCounts,
    };
  });
}

export interface GetAdminAuditEventsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  eventType?: "all" | "tunnel.connected" | "tunnel.disconnected";
}

export async function getAdminAuditEvents(db: Database, params: GetAdminAuditEventsParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (params.eventType && params.eventType !== "all") {
    conditions.push(eq(tunnelEvents.eventType, params.eventType));
  }

  if (params.search && params.search.trim() !== "") {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        ilike(user.email, term),
        ilike(tunnelEvents.anonymousId, term),
        sql`(${tunnelEvents.properties}->>'subdomain') ILIKE ${term}`,
        sql`(${tunnelEvents.properties}->>'remote_ip') ILIKE ${term}`,
        sql`(${tunnelEvents.properties}->>'remoteIp') ILIKE ${term}`,
        sql`(${tunnelEvents.properties}->>'country') ILIKE ${term}`,
        sql`(${tunnelEvents.properties}->>'city') ILIKE ${term}`,
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [[{ total }], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(tunnelEvents)
      .leftJoin(user, eq(tunnelEvents.userId, user.id))
      .where(whereClause),
    db
      .select({
        id: tunnelEvents.id,
        eventId: tunnelEvents.eventId,
        eventType: tunnelEvents.eventType,
        properties: tunnelEvents.properties,
        occurredAt: tunnelEvents.occurredAt,
        anonymousId: tunnelEvents.anonymousId,
        userEmail: user.email,
      })
      .from(tunnelEvents)
      .leftJoin(user, eq(tunnelEvents.userId, user.id))
      .where(whereClause)
      .orderBy(desc(tunnelEvents.occurredAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const items = rows.map((e) => {
    const props = (e.properties as Record<string, any>) || {};
    return {
      id: e.id,
      eventId: e.eventId,
      eventType: e.eventType,
      subdomain: props.subdomain ? String(props.subdomain) : null,
      remoteIp: props.remote_ip
        ? String(props.remote_ip)
        : props.remoteIp
          ? String(props.remoteIp)
          : null,
      country: props.country ? String(props.country) : null,
      city: props.city ? String(props.city) : null,
      anonymousId: e.anonymousId,
      occurredAt: e.occurredAt,
      userEmail: e.userEmail,
      properties: props,
    };
  });

  const totalNum = Number(total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalNum / pageSize));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: totalNum,
      totalPages,
    },
  };
}

export interface GetAdminUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: "all" | "admin" | "user";
  planId?: string;
  sortBy?: "createdAt" | "email";
  sortOrder?: "asc" | "desc";
}

export async function getAdminUsers(db: Database, params: GetAdminUsersParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 15));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (params.search && params.search.trim() !== "") {
    const term = `%${params.search.trim()}%`;
    conditions.push(or(ilike(user.email, term), ilike(user.name, term)));
  }

  if (params.role && params.role !== "all") {
    conditions.push(eq(user.role, params.role));
  }

  if (params.planId && params.planId !== "all") {
    conditions.push(eq(user.planId, params.planId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(user).where(whereClause),
    db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        planName: plans.name,
        planId: plans.id,
        createdAt: user.createdAt,
      })
      .from(user)
      .leftJoin(plans, eq(user.planId, plans.id))
      .where(whereClause)
      .orderBy(params.sortOrder === "asc" ? asc(user.createdAt) : desc(user.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const totalNum = Number(total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalNum / pageSize));

  const userIds = rows.map((u) => u.id);
  if (userIds.length === 0) {
    return {
      users: [],
      pagination: {
        page,
        pageSize,
        total: totalNum,
        totalPages,
      },
    };
  }

  // Scoped queries: ONLY fetch SSH keys, tunnels and custom domains for the current page users
  const [sshCounts, userTunnels, userCustomDomains] = await Promise.all([
    db
      .select({ userId: sshKeys.userId, keyCount: count() })
      .from(sshKeys)
      .where(inArray(sshKeys.userId, userIds))
      .groupBy(sshKeys.userId),
    db
      .select({ userId: tunnels.userId, subdomain: tunnels.subdomain })
      .from(tunnels)
      .where(inArray(tunnels.userId, userIds)),
    db
      .select({
        userId: customDomains.userId,
        domain: customDomains.domain,
        status: customDomains.status,
      })
      .from(customDomains)
      .where(inArray(customDomains.userId, userIds)),
  ]);

  const sshMap = new Map(sshCounts.map((s) => [s.userId, s.keyCount]));
  const tunnelMap = new Map<string, string[]>();
  for (const t of userTunnels) {
    const list = tunnelMap.get(t.userId) ?? [];
    list.push(t.subdomain);
    tunnelMap.set(t.userId, list);
  }

  const customDomainMap = new Map<string, { domain: string; status: string }[]>();
  for (const d of userCustomDomains) {
    const list = customDomainMap.get(d.userId) ?? [];
    list.push({ domain: d.domain, status: d.status });
    customDomainMap.set(d.userId, list);
  }

  const users = rows.map((u) => ({
    ...u,
    sshKeyCount: sshMap.get(u.id) ?? 0,
    reservedSubdomains: tunnelMap.get(u.id) ?? [],
    customDomains: customDomainMap.get(u.id) ?? [],
  }));

  return {
    users,
    pagination: {
      page,
      pageSize,
      total: totalNum,
      totalPages,
    },
  };
}

export async function updateUserPlan(db: Database, userId: string, planId: string) {
  const [targetPlan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);

  if (!targetPlan) {
    throw badRequest(`Plan with ID '${planId}' does not exist`);
  }

  const [updatedUser] = await db
    .update(user)
    .set({ planId: targetPlan.id, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id, email: user.email, planId: user.planId });

  if (!updatedUser) {
    throw notFound("User not found");
  }

  return { success: true, user: updatedUser, plan: targetPlan.name };
}

export async function updateUserRole(db: Database, userId: string, role: "user" | "admin") {
  if (role !== "user" && role !== "admin") {
    throw badRequest("Role must be 'user' or 'admin'");
  }

  const [updatedUser] = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id, email: user.email, role: user.role });

  if (!updatedUser) {
    throw notFound("User not found");
  }

  return { success: true, user: updatedUser };
}

export async function getAdminPlans(db: Database) {
  return db.select().from(plans).orderBy(plans.createdAt);
}

export async function createAdminPlan(
  db: Database,
  data: {
    name: string;
    maxReservedSubdomains: number;
    maxActiveTunnels: number;
    maxCustomDomains?: number;
    isDefault?: boolean;
  },
) {
  const planName = data.name.trim().toLowerCase();
  const [existing] = await db.select().from(plans).where(eq(plans.name, planName)).limit(1);

  if (existing) {
    throw conflict(`Plan with name '${planName}' already exists`);
  }

  const [newPlan] = await db
    .insert(plans)
    .values({
      name: planName,
      maxReservedSubdomains: data.maxReservedSubdomains,
      maxActiveTunnels: data.maxActiveTunnels,
      maxCustomDomains: data.maxCustomDomains ?? 1,
      isDefault: data.isDefault ?? false,
    })
    .returning();

  return newPlan;
}

export function getAdminBandwidthAnalytics(db: Database, period: "24h" | "7d" | "30d" = "24h") {
  return cachedAnalytics(db, `bandwidth:${period}`, 15_000, () =>
    queryAdminBandwidthAnalytics(db, period),
  );
}

async function queryAdminBandwidthAnalytics(db: Database, period: "24h" | "7d" | "30d" = "24h") {
  const now = Date.now();
  const periodHours = period === "30d" ? 30 * 24 : period === "7d" ? 7 * 24 : 24;
  const since = new Date(now - periodHours * 60 * 60 * 1000);

  const [rawBuckets, topSubdomainRows] = await Promise.all([
    db
      .select({
        bucketStart: tunnelBandwidth.bucketStart,
        requestCount: sql<number>`COALESCE(SUM(${tunnelBandwidth.requestCount}), 0)::int`,
        bytesIn: sql<number>`COALESCE(SUM(${tunnelBandwidth.bytesIn}), 0)::bigint`,
        bytesOut: sql<number>`COALESCE(SUM(${tunnelBandwidth.bytesOut}), 0)::bigint`,
        errorCount: sql<number>`COALESCE(SUM(${tunnelBandwidth.errorCount}), 0)::int`,
        totalDurationMs: sql<number>`COALESCE(SUM(${tunnelBandwidth.totalDurationMs}), 0)::bigint`,
      })
      .from(tunnelBandwidth)
      .where(and(gte(tunnelBandwidth.bucketStart, since), isNotNull(tunnelBandwidth.userId)))
      .groupBy(tunnelBandwidth.bucketStart)
      .orderBy(asc(tunnelBandwidth.bucketStart)),

    db
      .select({
        subdomain: tunnelBandwidth.subdomain,
        requestCount: sql<number>`COALESCE(SUM(${tunnelBandwidth.requestCount}), 0)::int`,
        bytesIn: sql<number>`COALESCE(SUM(${tunnelBandwidth.bytesIn}), 0)::bigint`,
        bytesOut: sql<number>`COALESCE(SUM(${tunnelBandwidth.bytesOut}), 0)::bigint`,
        totalBytes: sql<number>`COALESCE(SUM(${tunnelBandwidth.bytesIn} + ${tunnelBandwidth.bytesOut}), 0)::bigint`,
      })
      .from(tunnelBandwidth)
      .where(and(gte(tunnelBandwidth.bucketStart, since), isNotNull(tunnelBandwidth.userId)))
      .groupBy(tunnelBandwidth.subdomain)
      .orderBy(sql`SUM(${tunnelBandwidth.bytesIn} + ${tunnelBandwidth.bytesOut}) DESC`)
      .limit(5),
  ]);

  let totalRequests = 0;
  let totalBytesIn = 0;
  let totalBytesOut = 0;
  let totalErrors = 0;
  let totalDurationMs = 0;

  const timeSeries = rawBuckets.map((b) => {
    const reqCount = Number(b.requestCount ?? 0);
    const bIn = Number(b.bytesIn ?? 0);
    const bOut = Number(b.bytesOut ?? 0);
    const errCount = Number(b.errorCount ?? 0);
    const durMs = Number(b.totalDurationMs ?? 0);

    totalRequests += reqCount;
    totalBytesIn += bIn;
    totalBytesOut += bOut;
    totalErrors += errCount;
    totalDurationMs += durMs;

    const avgDurationMs = reqCount > 0 ? Math.round(durMs / reqCount) : 0;
    const errorRate = reqCount > 0 ? +((errCount / reqCount) * 100).toFixed(1) : 0;

    return {
      bucketStart: b.bucketStart.toISOString(),
      requestCount: reqCount,
      bytesIn: bIn,
      bytesOut: bOut,
      errorCount: errCount,
      avgDurationMs,
      errorRate,
    };
  });

  const avgDurationMs = totalRequests > 0 ? Math.round(totalDurationMs / totalRequests) : 0;
  const errorRate = totalRequests > 0 ? +((totalErrors / totalRequests) * 100).toFixed(1) : 0;
  const successRate = totalRequests > 0 ? Math.max(0, +(100 - errorRate).toFixed(1)) : 100;

  const topSubdomains = topSubdomainRows.map((s) => ({
    subdomain: s.subdomain,
    requestCount: Number(s.requestCount ?? 0),
    bytesIn: Number(s.bytesIn ?? 0),
    bytesOut: Number(s.bytesOut ?? 0),
    totalBytes: Number(s.totalBytes ?? 0),
  }));

  return {
    period,
    summary: {
      totalRequests,
      totalBytesIn,
      totalBytesOut,
      totalBandwidth: totalBytesIn + totalBytesOut,
      totalErrors,
      avgDurationMs,
      errorRate,
      successRate,
    },
    timeSeries,
    topSubdomains,
  };
}
