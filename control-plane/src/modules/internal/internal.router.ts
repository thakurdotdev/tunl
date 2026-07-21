import { timingSafeEqual } from "node:crypto";
import { and, eq, lt, ne } from "drizzle-orm";
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

      // Sweep orphaned sessions for this user on different subdomains.
      // These accumulate when ReportDisconnected is never called (server restart,
      // network partition, pre-deploy connections). Safe to delete — if a session
      // is alive the tunnel server will re-report it on the next keepalive cycle.
      const orphans = await db
        .delete(activeTunnelSessions)
        .where(
          and(
            eq(activeTunnelSessions.userId, userId),
            ne(activeTunnelSessions.subdomain, subdomain),
          ),
        )
        .returning({ subdomain: activeTunnelSessions.subdomain, tunnelId: activeTunnelSessions.tunnelId });

      // Reset any reservations whose sessions we just wiped so they show as reserved not active.
      for (const orphan of orphans) {
        if (orphan.tunnelId) {
          await db
            .update(tunnels)
            .set({ status: "reserved", updatedAt: new Date() })
            .where(eq(tunnels.id, orphan.tunnelId));
        }
      }

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
    "/tunnel-heartbeat",
    asyncRoute(async (req, res) => {
      const { userId, subdomain } = sessionDisconnectedBody.parse(req.body);

      await db
        .update(activeTunnelSessions)
        .set({ lastSeenAt: new Date() })
        .where(
          and(
            eq(activeTunnelSessions.userId, userId),
            eq(activeTunnelSessions.subdomain, subdomain),
          ),
        );

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

// Purge sessions where lastSeenAt hasn't been updated in over 3 minutes
// (6 missed keepalive intervals). Called once at startup; runs on a 60s cadence.
export function startStaleSessionSweeper(db: Database) {
  const STALE_THRESHOLD_MS = 3 * 60 * 1000;

  async function sweep() {
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
    const stale = await db
      .delete(activeTunnelSessions)
      .where(lt(activeTunnelSessions.lastSeenAt, cutoff))
      .returning({ tunnelId: activeTunnelSessions.tunnelId });

    for (const row of stale) {
      if (row.tunnelId) {
        await db
          .update(tunnels)
          .set({ status: "reserved", updatedAt: new Date() })
          .where(eq(tunnels.id, row.tunnelId));
      }
    }

    if (stale.length > 0) {
      console.info({ count: stale.length }, "swept stale tunnel sessions");
    }
  }

  sweep().catch(console.error);
  setInterval(() => sweep().catch(console.error), 60_000);
}
