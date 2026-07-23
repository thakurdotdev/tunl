import { count, eq, ilike, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { activeTunnelSessions, plans, sshKeys, tunnels, users } from "../../db/schema.js";
import { badRequest, conflict, notFound } from "../../platform/errors.js";

export async function getAdminAnalytics(db: Database) {
  const [[{ totalUsers }], [{ totalActiveSessions }], [{ totalTunnels }], planDistribution] =
    await Promise.all([
      db.select({ totalUsers: count() }).from(users),
      db.select({ totalActiveSessions: count() }).from(activeTunnelSessions),
      db.select({ totalTunnels: count() }).from(tunnels),
      db
        .select({
          planName: plans.name,
          userCount: count(users.id),
        })
        .from(plans)
        .leftJoin(users, eq(users.planId, plans.id))
        .groupBy(plans.name),
    ]);

  return {
    totalUsers,
    totalActiveSessions,
    totalTunnels,
    planDistribution,
  };
}

export async function getAdminUsers(db: Database, search?: string) {
  const query = db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      planName: plans.name,
      planId: plans.id,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(plans, eq(users.planId, plans.id));

  if (search && search.trim() !== "") {
    const term = `%${search.trim()}%`;
    query.where(ilike(users.email, term));
  }

  const rows = await query.orderBy(sql`${users.createdAt} DESC`);

  // Fetch counts per user
  const userIds = rows.map((u) => u.id);
  if (userIds.length === 0) {
    return [];
  }

  const [sshCounts, tunnelCounts] = await Promise.all([
    db.select({ userId: sshKeys.userId, keyCount: count() }).from(sshKeys).groupBy(sshKeys.userId),
    db
      .select({ userId: tunnels.userId, tunnelCount: count() })
      .from(tunnels)
      .groupBy(tunnels.userId),
  ]);

  const sshMap = new Map(sshCounts.map((s) => [s.userId, s.keyCount]));
  const tunnelMap = new Map(tunnelCounts.map((t) => [t.userId, t.tunnelCount]));

  return rows.map((u) => ({
    ...u,
    sshKeyCount: sshMap.get(u.id) ?? 0,
    reservedSubdomainsCount: tunnelMap.get(u.id) ?? 0,
  }));
}

export async function updateUserPlan(db: Database, userId: string, planNameOrId: string) {
  const [targetPlan] = await db
    .select()
    .from(plans)
    .where(sql`${plans.name} = ${planNameOrId} OR ${plans.id} = ${planNameOrId}`)
    .limit(1);

  if (!targetPlan) {
    throw badRequest(`Plan '${planNameOrId}' does not exist`);
  }

  const [updatedUser] = await db
    .update(users)
    .set({ planId: targetPlan.id, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, planId: users.planId });

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
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, role: users.role });

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
