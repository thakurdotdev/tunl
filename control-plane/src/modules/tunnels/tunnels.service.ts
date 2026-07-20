import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { plans, sshKeys, tunnels, users } from "../../db/schema.js";
import { conflict, forbidden, notFound } from "../../platform/errors.js";
import type { RedisClient } from "../../redis/client.js";
import { redisKeys } from "../../redis/keys.js";

export const tunnelOutputSelect = {
  id: tunnels.id,
  subdomain: tunnels.subdomain,
  status: tunnels.status,
  lastConnectedAt: tunnels.lastConnectedAt,
  createdAt: tunnels.createdAt,
};

export async function listUserTunnels(db: Database, userId: string) {
  return db
    .select(tunnelOutputSelect)
    .from(tunnels)
    .where(eq(tunnels.userId, userId))
    .orderBy(desc(tunnels.createdAt));
}

export async function createUserTunnel(db: Database, userId: string, subdomain: string) {
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select id from users where id = ${userId} for update`);

      const [user] = await tx
        .select({ max: plans.maxReservedSubdomains })
        .from(users)
        .innerJoin(plans, eq(users.planId, plans.id))
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw notFound("user not found");
      }

      const [{ value }] = await tx
        .select({ value: count() })
        .from(tunnels)
        .where(eq(tunnels.userId, userId));

      if (value >= user.max) {
        throw forbidden(`your plan allows at most ${user.max} reserved subdomain(s)`);
      }

      const [existing] = await tx
        .select({ id: tunnels.id })
        .from(tunnels)
        .where(eq(tunnels.subdomain, subdomain))
        .limit(1);

      if (existing) {
        throw conflict("subdomain is already reserved");
      }

      const [tunnel] = await tx
        .insert(tunnels)
        .values({ userId, subdomain })
        .returning(tunnelOutputSelect);

      return tunnel;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("subdomain is already reserved");
    }

    throw error;
  }
}

export async function deleteUserTunnel(db: Database, userId: string, tunnelId: string) {
  const deleted = await db
    .delete(tunnels)
    .where(and(eq(tunnels.id, tunnelId), eq(tunnels.userId, userId)))
    .returning({ id: tunnels.id });

  if (!deleted.length) {
    throw notFound("tunnel not found");
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function invalidateUserKeyCache(db: Database, redis: RedisClient, userId: string) {
  const keys = await db
    .select({ fingerprint: sshKeys.fingerprint })
    .from(sshKeys)
    .where(eq(sshKeys.userId, userId));
  for (const k of keys) {
    await redis.del(redisKeys.validateKey(k.fingerprint));
  }
}
