import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { plans, sshKeys, tunnels, users } from "../../db/schema.js";
import type { Config } from "../../platform/config.js";
import { notFound, unauthorized } from "../../platform/errors.js";
import { asyncRoute } from "../../platform/http.js";

const validateKey = z.object({ fingerprint: z.string().regex(/^SHA256:[A-Za-z0-9+/]+$/) });
const usageEvent = z.object({
  tunnelId: z.uuid(),
  bytesTransferred: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
});
function authorized(token: string | undefined, secret: string) {
  if (!token) return false;
  const a = Buffer.from(token),
    b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function internalRouter(db: Database, config: Config) {
  const router = Router();
  router.use((req, _res, next) =>
    authorized(req.header("x-internal-token"), config.INTERNAL_SHARED_SECRET)
      ? next()
      : next(unauthorized()),
  );
  router.post(
    "/validate-key",
    asyncRoute(async (req, res) => {
      const { fingerprint } = validateKey.parse(req.body);
      const [row] = await db
        .select({ userId: users.id, plan: plans.name, allowedSubdomain: tunnels.subdomain })
        .from(sshKeys)
        .innerJoin(users, eq(sshKeys.userId, users.id))
        .innerJoin(plans, eq(users.planId, plans.id))
        .leftJoin(tunnels, and(eq(tunnels.userId, users.id), eq(tunnels.status, "reserved")))
        .where(eq(sshKeys.fingerprint, fingerprint))
        .limit(1);
      if (!row) throw notFound("SSH key not found");
      res.json(row);
    }),
  );
  router.post(
    "/usage",
    asyncRoute(async (req, res) => {
      const event = usageEvent.parse(req.body);
      console.info({ event }, "tunnel usage received");
      res.status(204).send();
    }),
  );
  return router;
}
