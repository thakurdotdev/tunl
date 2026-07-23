import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { asyncRoute } from "../../platform/http.js";
import type { RedisClient } from "../../redis/client.js";
import {
  getRecentRequests,
  subscribeLiveRequests,
  verifySubdomainOwnership,
} from "./inspect.service.js";

const subdomainParam = z.string().regex(/^[a-z0-9-]{3,63}$/);
const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export function inspectRouter(db: Database, redis: RedisClient) {
  const router = Router();

  router.get(
    "/:subdomain/requests",
    asyncRoute(async (req, res) => {
      const subdomain = subdomainParam.parse(req.params.subdomain);
      await verifySubdomainOwnership(db, req.userId!, subdomain);

      const { limit, offset } = paginationQuery.parse(req.query);
      const requests = await getRecentRequests(redis, subdomain, limit, offset);
      res.json(requests);
    }),
  );

  router.get(
    "/:subdomain/stream",
    asyncRoute(async (req, res) => {
      const subdomain = subdomainParam.parse(req.params.subdomain);
      await verifySubdomainOwnership(db, req.userId!, subdomain);

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(":\n\n");

      const heartbeat = setInterval(() => {
        res.write(": heartbeat\n\n");
      }, 15_000);

      const unsubscribe = subscribeLiveRequests(redis, subdomain, (data) => {
        res.write(`data: ${data}\n\n`);
      });

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      req.on("close", cleanup);
      req.on("error", cleanup);
    }),
  );

  return router;
}
