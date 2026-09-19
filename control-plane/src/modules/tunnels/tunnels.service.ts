import { createHash } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { plans, sshKeys, tunnels, user } from "../../db/schema.js";
import { badRequest, conflict, forbidden, notFound } from "../../platform/errors.js";
import type { RedisClient } from "../../redis/client.js";
import { redisKeys } from "../../redis/keys.js";
import { reservedSubdomains } from "./constant.js";

export const tunnelOutputSelect = {
  id: tunnels.id,
  subdomain: tunnels.subdomain,
  status: tunnels.status,
  password: tunnels.password,
  lastConnectedAt: tunnels.lastConnectedAt,
  createdAt: tunnels.createdAt,
};

function hashPassword(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

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
      if (reservedSubdomains.includes(subdomain)) {
        throw conflict("subdomain is already reserved");
      }
      await tx.execute(sql`select id from "user" where id = ${userId} for update`);

      const [userPlan] = await tx
        .select({ max: plans.maxReservedSubdomains })
        .from(user)
        .leftJoin(plans, eq(user.planId, plans.id))
        .where(eq(user.id, userId))
        .limit(1);

      const maxSubdomains = userPlan?.max ?? 1;

      const [{ value }] = await tx
        .select({ value: count() })
        .from(tunnels)
        .where(eq(tunnels.userId, userId));

      if (value >= maxSubdomains) {
        throw forbidden(`your plan allows at most ${maxSubdomains} reserved subdomain(s)`);
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

export async function deleteUserTunnel(
  db: Database,
  redis: RedisClient,
  userId: string,
  tunnelId: string,
) {
  const deleted = await db
    .delete(tunnels)
    .where(and(eq(tunnels.id, tunnelId), eq(tunnels.userId, userId)))
    .returning({ id: tunnels.id, subdomain: tunnels.subdomain });

  if (!deleted.length) {
    throw notFound("tunnel not found");
  }

  await redis.del(`tunl:requests:${deleted[0].subdomain}`);
}

export async function updateTunnelPassword(
  db: Database,
  redis: RedisClient,
  userId: string,
  tunnelId: string,
  password: string | null,
) {
  if (password !== null && password.length < 4) {
    throw badRequest("Password must be at least 4 characters");
  }

  const hashed = password ? hashPassword(password) : null;

  const [updated] = await db
    .update(tunnels)
    .set({ password: hashed, updatedAt: new Date() })
    .where(and(eq(tunnels.id, tunnelId), eq(tunnels.userId, userId)))
    .returning({ id: tunnels.id, subdomain: tunnels.subdomain });

  if (!updated) {
    throw notFound("tunnel not found");
  }

  // Publish password update so the tunnel server picks it up in real-time
  await redis.publish(
    "tunl:tunnel-password-updated",
    JSON.stringify({ subdomain: updated.subdomain, passwordHash: hashed }),
  );

  return { id: updated.id, hasPassword: hashed !== null };
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

  const userTunnels = await db
    .select({ subdomain: tunnels.subdomain })
    .from(tunnels)
    .where(eq(tunnels.userId, userId));
  const reservedSubdomainsList = userTunnels.map((t) => t.subdomain);

  await redis.publish(
    "tunl:subdomains-updated",
    JSON.stringify({ userId, reservedSubdomains: reservedSubdomainsList }),
  );
}
