import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import type { Config } from "../../platform/config.js";
import { asyncRoute } from "../../platform/http.js";
import { RedisRateLimitStore, rateLimit } from "../../platform/rate-limit.js";
import type { RedisClient } from "../../redis/client.js";
import {
  createUserCustomDomain,
  deleteUserCustomDomain,
  listUserCustomDomains,
} from "./custom-domains.service.js";
import { verifyUserCustomDomain } from "./verify.service.js";

const createSchema = z.object({
  domain: z.string().min(3).max(253),
  tunnelId: z.uuid(),
});

export function customDomainsRouter(db: Database, redis: RedisClient, config: Config) {
  const router = Router();
  const verifyLimiter = rateLimit(
    new RedisRateLimitStore(redis),
    "custom-domain-verify",
    20,
    60_000,
  );

  router.get(
    "/",
    asyncRoute(async (req, res) => {
      res.json(await listUserCustomDomains(db, req.userId!, config.BASE_DOMAIN));
    }),
  );

  router.post(
    "/",
    asyncRoute(async (req, res) => {
      const { domain, tunnelId } = createSchema.parse(req.body);
      const created = await createUserCustomDomain(
        db,
        redis,
        req.userId!,
        domain,
        tunnelId,
        config.BASE_DOMAIN,
      );
      res.status(201).json(created);
    }),
  );

  router.post(
    "/:id/verify",
    verifyLimiter,
    asyncRoute(async (req, res) => {
      const id = z.uuid().parse(req.params.id);
      const result = await verifyUserCustomDomain(db, redis, req.userId!, id, config.BASE_DOMAIN);
      res.json(result);
    }),
  );

  router.delete(
    "/:id",
    asyncRoute(async (req, res) => {
      const id = z.uuid().parse(req.params.id);
      await deleteUserCustomDomain(db, redis, req.userId!, id);
      res.status(204).send();
    }),
  );

  return router;
}
