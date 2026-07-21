import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { activeTunnelSessions, plans, sshKeys, tunnels, users } from "../../db/schema.js";
import type { Config } from "../../platform/config.js";
import { notFound, unauthorized } from "../../platform/errors.js";
import { asyncRoute } from "../../platform/http.js";
import type { RedisClient } from "../../redis/client.js";
import { redisKeys } from "../../redis/keys.js";

const validateKeyBody = z.object({ fingerprint: z.string().regex(/^SHA256:[A-Za-z0-9+/=]+$/) });
const usageBody = z.object({
  tunnelId: z.uuid(),
  bytesTransferred: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
});
const sessionConnectedBody = z.object({
  userId: z.uuid(),
  subdomain: z.string().min(1),
  remoteIp: z.string().default(""),
});
const sessionDisconnectedBody = z.object({
  userId: z.uuid(),
  subdomain: z.string().min(1),
});

function authorized(token: string | undefined, secret: string) {
  if (!token) return false;
  const a = Buffer.from(token.trim()),
    b = Buffer.from(secret.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function internalRouter(db: Database, redis: RedisClient, config: Config) {
  const router = Router();
  router.use((req, _res, next) =>
    authorized(req.header("x-internal-token"), config.INTERNAL_SHARED_SECRET)
      ? next()
      : next(unauthorized()),
  );

  router.post(
    "/validate-key",
    asyncRoute(async (req, res) => {
      const { fingerprint } = validateKeyBody.parse(req.body);
      const cacheKey = redisKeys.validateKey(fingerprint);
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const [row] = await db
        .select({
          userId: users.id,
          email: users.email,
          plan: plans.name,
          allowedSubdomain: tunnels.subdomain,
          maxActiveTunnels: plans.maxActiveTunnels,
        })
        .from(sshKeys)
        .innerJoin(users, eq(sshKeys.userId, users.id))
        .innerJoin(plans, eq(users.planId, plans.id))
        .leftJoin(tunnels, and(eq(tunnels.userId, users.id), eq(tunnels.status, "reserved")))
        .where(eq(sshKeys.fingerprint, fingerprint))
        .limit(1);

      if (!row) throw notFound("SSH key not found");

      await redis.set(cacheKey, JSON.stringify(row), { EX: 300 });
      res.json(row);
    }),
  );

  router.post(
    "/tunnel-connected",
    asyncRoute(async (req, res) => {
      const { userId, subdomain, remoteIp } = sessionConnectedBody.parse(req.body);

      // Resolve tunnelId if this subdomain matches a reservation for this user.
      const [reservation] = await db
        .select({ id: tunnels.id })
        .from(tunnels)
        .where(and(eq(tunnels.userId, userId), eq(tunnels.subdomain, subdomain)))
        .limit(1);

      // Upsert on (userId, subdomain) — handles reconnects without duplicates.
      await db
        .insert(activeTunnelSessions)
        .values({
          userId,
          tunnelId: reservation?.id ?? null,
          subdomain,
          remoteIp,
        })
        .onConflictDoUpdate({
          target: [activeTunnelSessions.userId, activeTunnelSessions.subdomain],
          set: {
            remoteIp,
            connectedAt: new Date(),
            lastSeenAt: new Date(),
          },
        });

      // Mark the reservation active if one exists.
      if (reservation) {
        await db
          .update(tunnels)
          .set({ status: "active", lastConnectedAt: new Date(), updatedAt: new Date() })
          .where(eq(tunnels.id, reservation.id));
      }

      res.status(204).send();
    }),
  );

  router.post(
    "/tunnel-disconnected",
    asyncRoute(async (req, res) => {
      const { userId, subdomain } = sessionDisconnectedBody.parse(req.body);

      await db
        .delete(activeTunnelSessions)
        .where(
          and(
            eq(activeTunnelSessions.userId, userId),
            eq(activeTunnelSessions.subdomain, subdomain),
          ),
        );

      // Mark the reservation back to reserved (not deleted — the reservation persists).
      const [reservation] = await db
        .select({ id: tunnels.id })
        .from(tunnels)
        .where(and(eq(tunnels.userId, userId), eq(tunnels.subdomain, subdomain)))
        .limit(1);

      if (reservation) {
        await db
          .update(tunnels)
          .set({ status: "reserved", updatedAt: new Date() })
          .where(eq(tunnels.id, reservation.id));
      }

      res.status(204).send();
    }),
  );

  router.post(
    "/usage",
    asyncRoute(async (req, res) => {
      const event = usageBody.parse(req.body);
      console.info({ event }, "tunnel usage received");
      res.status(204).send();
    }),
  );

  return router;
}

