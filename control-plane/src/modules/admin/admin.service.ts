import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import {
  activeTunnelSessions,
  identityLinks,
  plans,
  sshKeys,
  tunnelBandwidth,
  tunnelEvents,
  tunnels,
  user,
} from "../../db/schema.js";
import { badRequest, conflict, notFound } from "../../platform/errors.js";

export async function getAdminAnalytics(db: Database) {
  const [
    [{ totalUsers }],
    [{ totalActiveSessions }],
    [{ totalTunnels }],
    [{ totalEvents }],
    [{ totalLinkedIdentities }],
    [{ totalAuthEvents, totalAnonEvents }],
    planDistribution,
    eventTypeCounts,
    activeSessionsList,
    recentEventsList,
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(user),
    db.select({ totalActiveSessions: count() }).from(activeTunnelSessions),
    db.select({ totalTunnels: count() }).from(tunnels),
    db.select({ totalEvents: count() }).from(tunnelEvents),
    db.select({ totalLinkedIdentities: count() }).from(identityLinks),
    db
      .select({
        totalAuthEvents: count(tunnelEvents.userId),
        totalAnonEvents: count(sql`CASE WHEN ${tunnelEvents.userId} IS NULL THEN 1 END`),
      })
      .from(tunnelEvents),
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
    db
      .select({
        eventType: tunnelEvents.eventType,
        eventCount: count(),
      })
      .from(tunnelEvents)
      .groupBy(tunnelEvents.eventType),
    db
      .select({
        id: activeTunnelSessions.id,
        subdomain: activeTunnelSessions.subdomain,
        remoteIp: activeTunnelSessions.remoteIp,
        connectedAt: activeTunnelSessions.connectedAt,
        userEmail: user.email,
      })
      .from(activeTunnelSessions)
      .leftJoin(user, eq(activeTunnelSessions.userId, user.id))
      .orderBy(sql`${activeTunnelSessions.connectedAt} DESC`)
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
      .orderBy(sql`${tunnelEvents.occurredAt} DESC`)
      .limit(5),
  ]);

  const mappedRecentEvents = recentEventsList.map((e) => {
    const props = (e.properties as Record<string, any>) || {};
    return {
      id: e.id,
      eventType: e.eventType,
      subdomain: props.subdomain ? String(props.subdomain) : null,
      remoteIp: props.remote_ip
        ? String(props.remote_ip)
        : props.remoteIp
          ? String(props.remoteIp)
          : null,
      occurredAt: e.occurredAt,
      userEmail: e.userEmail,
    };
  });

  return {
    totalUsers,
    totalActiveSessions,
    totalTunnels,
    totalEvents,
    totalLinkedIdentities: Number(totalLinkedIdentities ?? 0),
    totalAuthEvents: Number(totalAuthEvents ?? 0),
    totalAnonEvents: Number(totalAnonEvents ?? 0),
    planDistribution: planDistribution.map((p) => ({
      ...p,
      userCount: Number(p.userCount ?? 0),
    })),
    eventTypeCounts: eventTypeCounts.map((ec) => ({
      ...ec,
      eventCount: Number(ec.eventCount ?? 0),
    })),
    activeSessionsList,
    recentEventsList: mappedRecentEvents,
  };
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

  // Scoped queries: ONLY fetch SSH keys and tunnels for the current page users
  const [sshCounts, userTunnels] = await Promise.all([
    db
      .select({ userId: sshKeys.userId, keyCount: count() })
      .from(sshKeys)
      .where(inArray(sshKeys.userId, userIds))
      .groupBy(sshKeys.userId),
    db
      .select({ userId: tunnels.userId, subdomain: tunnels.subdomain })
      .from(tunnels)
      .where(inArray(tunnels.userId, userIds)),
  ]);

  const sshMap = new Map(sshCounts.map((s) => [s.userId, s.keyCount]));
  const tunnelMap = new Map<string, string[]>();
  for (const t of userTunnels) {
    const list = tunnelMap.get(t.userId) ?? [];
    list.push(t.subdomain);
    tunnelMap.set(t.userId, list);
  }

  const users = rows.map((u) => ({
    ...u,
    sshKeyCount: sshMap.get(u.id) ?? 0,
    reservedSubdomains: tunnelMap.get(u.id) ?? [],
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
      isDefault: data.isDefault ?? false,
    })
    .returning();

  return newPlan;
}

export async function getAdminBandwidthAnalytics(
  db: Database,
  period: "24h" | "7d" | "30d" = "24h",
) {
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
      .where(gte(tunnelBandwidth.bucketStart, since))
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
      .where(gte(tunnelBandwidth.bucketStart, since))
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
