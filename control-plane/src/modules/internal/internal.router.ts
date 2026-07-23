import { timingSafeEqual } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import {
  activeTunnelSessions,
  identityLinks,
  plans,
  sshKeys,
  tunnelEvents,
  tunnels,
  users,
} from "../../db/schema.js";
import type { Config } from "../../platform/config.js";
import { notFound, unauthorized } from "../../platform/errors.js";
import { asyncRoute } from "../../platform/http.js";
import type { RedisClient } from "../../redis/client.js";
import { redisKeys } from "../../redis/keys.js";

export const validateKeyBody = z.object({
  fingerprint: z.string().min(1),
});

export const sessionConnectedBody = z.object({
  userId: z.string().optional(),
  anonymousId: z.string().default(""),
  subdomain: z.string().min(1),
  remoteIp: z.string().default(""),
  plan: z.string().optional(),
  sessionType: z.enum(["anonymous", "authenticated"]),
  occurredAt: z.string().min(1),
  eventId: z.string().min(1),
});
const usageBody = z.object({
  tunnelId: z.uuid(),
  bytesTransferred: z.number().int().nonnegative(),
  timestamp: z.string().min(1),
});
const sessionDisconnectedBody = z.object({
  userId: z.string().optional(),
  anonymousId: z.string().default(""),
  subdomain: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  disconnectReason: z.string().default("client_closed"),
  occurredAt: z.string().min(1),
  eventId: z.string().min(1),
});
const identityLinkBody = z.object({
  anonymousId: z.string().min(1),
  userId: z.uuid(),
});

function authorized(token: string | undefined, secret: string) {
  if (!token) return false;
  const a = Buffer.from(token.trim()),
    b = Buffer.from(secret.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function internalRouter(db: Database, redis: RedisClient, config: Config) {
  const router = Router();
  router.use((req, _res, next) => {
    const token = req.header("x-internal-token");
    if (!authorized(token, config.INTERNAL_SHARED_SECRET)) {
      console.warn(
        `[internal-api] unauthorized request to ${req.path} (x-internal-token match: false)`,
      );
      return next(unauthorized());
    }
    next();
  });

  router.post(
    "/validate-key",
    asyncRoute(async (req, res) => {
      const { fingerprint } = validateKeyBody.parse(req.body);
      const cacheKey = redisKeys.validateKey(fingerprint);
      const cached = await redis.get(cacheKey);

      if (cached) {
        console.log(`[internal-api] /validate-key cache hit for fingerprint=${fingerprint}`);
        return res.json(JSON.parse(cached));
      }

      const [userRow] = await db
        .select({
          userId: users.id,
          email: users.email,
          plan: plans.name,
          maxActiveTunnels: plans.maxActiveTunnels,
          allowedIps: users.allowedIps,
          ipWhitelistEnabled: users.ipWhitelistEnabled,
        })
        .from(sshKeys)
        .innerJoin(users, eq(sshKeys.userId, users.id))
        .innerJoin(plans, eq(users.planId, plans.id))
        .where(eq(sshKeys.fingerprint, fingerprint))
        .limit(1);

      if (!userRow) {
        console.warn(`[internal-api] /validate-key not found for fingerprint=${fingerprint}`);
        throw notFound("SSH key not found");
      }

      const userTunnels = await db
        .select({ subdomain: tunnels.subdomain })
        .from(tunnels)
        .where(eq(tunnels.userId, userRow.userId));

      const reservedSubdomains = userTunnels.map((t) => t.subdomain);
      const allowedSubdomain = reservedSubdomains[0] ?? null;

      const result = {
        userId: userRow.userId,
        email: userRow.email,
        plan: userRow.plan,
        allowedSubdomain,
        reservedSubdomains,
        maxActiveTunnels: userRow.maxActiveTunnels,
        allowedIps: userRow.ipWhitelistEnabled ? (userRow.allowedIps ?? []) : [],
      };

      console.log(
        `[internal-api] /validate-key found user=${result.email} reservedSubdomains=[${reservedSubdomains.join(", ")}]`,
      );
      await redis.set(cacheKey, JSON.stringify(result), { EX: 300 });
      res.json(result);
    }),
  );

  router.post(
    "/tunnel-connected",
    asyncRoute(async (req, res) => {
      const body = sessionConnectedBody.parse(req.body);
      const { userId, anonymousId, subdomain, remoteIp, plan, sessionType, occurredAt, eventId } =
        body;

      console.log(
        `[internal-api] /tunnel-connected userId=${userId ?? "none"} subdomain=${subdomain} sessionType=${sessionType}`,
      );

      // Analytics: fire-and-forget — must never block or fail the operational write.
      db.insert(tunnelEvents)
        .values({
          eventId,
          eventType: "tunnel.connected",
          anonymousId,
          userId: userId ?? null,
          properties: { subdomain, remoteIp, plan: plan ?? null, sessionType },
          occurredAt: new Date(occurredAt),
        })
        .onConflictDoNothing()
        .catch((err: unknown) =>
          console.error({ err, eventId }, "failed to write tunnel.connected event"),
        );

      // Operational session tracking — authenticated only.
      // Wrapped in a transaction so orphan cleanup + session upsert are atomic.
      if (userId && sessionType === "authenticated") {
        await db.transaction(async (tx) => {
          const [reservation] = await tx
            .select({ id: tunnels.id })
            .from(tunnels)
            .where(and(eq(tunnels.userId, userId), eq(tunnels.subdomain, subdomain)))
            .limit(1);

          const orphans = await tx
            .delete(activeTunnelSessions)
            .where(
              and(
                eq(activeTunnelSessions.userId, userId),
                eq(activeTunnelSessions.subdomain, subdomain),
              ),
            )
            .returning({
              subdomain: activeTunnelSessions.subdomain,
              tunnelId: activeTunnelSessions.tunnelId,
            });

          for (const orphan of orphans) {
            if (orphan.tunnelId) {
              await tx
                .update(tunnels)
                .set({ status: "reserved", updatedAt: new Date() })
                .where(eq(tunnels.id, orphan.tunnelId));
            }
          }

          await tx.insert(activeTunnelSessions).values({
            userId,
            tunnelId: reservation?.id ?? null,
            subdomain,
            remoteIp,
          });

          if (reservation) {
            await tx
              .update(tunnels)
              .set({ status: "active", lastConnectedAt: new Date(), updatedAt: new Date() })
              .where(eq(tunnels.id, reservation.id));
          }
        });

        const keys = await db
          .select({ fingerprint: sshKeys.fingerprint })
          .from(sshKeys)
          .where(eq(sshKeys.userId, userId));
        for (const k of keys) {
          await redis.del(redisKeys.validateKey(k.fingerprint));
        }
      }

      res.status(204).send();
    }),
  );

  router.post(
    "/tunnel-disconnected",
    asyncRoute(async (req, res) => {
      const { userId, anonymousId, subdomain, durationMs, disconnectReason, occurredAt, eventId } =
        sessionDisconnectedBody.parse(req.body);

      // Analytics: fire-and-forget.
      db.insert(tunnelEvents)
        .values({
          eventId,
          eventType: "tunnel.disconnected",
          anonymousId,
          userId: userId ?? null,
          properties: {
            subdomain,
            durationMs: durationMs ?? null,
            disconnectReason: disconnectReason ?? "unknown",
          },
          occurredAt: new Date(occurredAt),
        })
        .onConflictDoNothing()
        .catch((err: unknown) =>
          console.error({ err, eventId }, "failed to write tunnel.disconnected event"),
        );

      if (userId) {
        await db
          .delete(activeTunnelSessions)
          .where(
            and(
              eq(activeTunnelSessions.userId, userId),
              eq(activeTunnelSessions.subdomain, subdomain),
            ),
          );

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

        const keys = await db
          .select({ fingerprint: sshKeys.fingerprint })
          .from(sshKeys)
          .where(eq(sshKeys.userId, userId));
        for (const k of keys) {
          await redis.del(redisKeys.validateKey(k.fingerprint));
        }
      }

      res.status(204).send();
    }),
  );

  router.post(
    "/tunnel-heartbeat",
    asyncRoute(async (req, res) => {
      const { userId, subdomain } = z
        .object({ userId: z.uuid(), subdomain: z.string().min(1) })
        .parse(req.body);

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

  // Called at signup when we know the user's anonymous device fingerprint.
  // Links past anonymous sessions to the new user for conversion attribution.
  router.post(
    "/identity-link",
    asyncRoute(async (req, res) => {
      const { anonymousId, userId } = identityLinkBody.parse(req.body);
      await db.insert(identityLinks).values({ anonymousId, userId }).onConflictDoNothing(); // device can only be linked once
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

export function startStaleSessionSweeper(db: Database) {
  const STALE_THRESHOLD_MS = 5 * 60 * 1000;

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
