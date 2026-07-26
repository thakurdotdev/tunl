import { count, eq, ilike, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import {
  activeTunnelSessions,
  identityLinks,
  plans,
  sshKeys,
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
      .limit(200),
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

export async function getAdminUsers(db: Database, search?: string) {
  const query = db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      planName: plans.name,
      planId: plans.id,
      createdAt: user.createdAt,
    })
    .from(user)
    .leftJoin(plans, eq(user.planId, plans.id));

  if (search && search.trim() !== "") {
    const term = `%${search.trim()}%`;
    query.where(ilike(user.email, term));
  }

  const rows = await query.orderBy(sql`${user.createdAt} DESC`);

  const userIds = rows.map((u) => u.id);
  if (userIds.length === 0) {
    return [];
  }

  const [sshCounts, userTunnels] = await Promise.all([
    db.select({ userId: sshKeys.userId, keyCount: count() }).from(sshKeys).groupBy(sshKeys.userId),
    db.select({ userId: tunnels.userId, subdomain: tunnels.subdomain }).from(tunnels),
  ]);

  const sshMap = new Map(sshCounts.map((s) => [s.userId, s.keyCount]));
  const tunnelMap = new Map<string, string[]>();
  for (const t of userTunnels) {
    const list = tunnelMap.get(t.userId) ?? [];
    list.push(t.subdomain);
    tunnelMap.set(t.userId, list);
  }

  return rows.map((u) => ({
    ...u,
    sshKeyCount: sshMap.get(u.id) ?? 0,
    reservedSubdomains: tunnelMap.get(u.id) ?? [],
  }));
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
