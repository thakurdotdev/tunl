import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { asyncRoute } from "../../platform/http.js";
import {
  createUserTunnel,
  deleteUserTunnel,
  invalidateUserKeyCache,
  listUserTunnels,
  updateTunnelPassword,
} from "./tunnels.service.js";

const createTunnelSchema = z.object({
  subdomain: z
    .string()
    .regex(
      /^[a-z0-9-]{3,63}$/,
      "Subdomain must be 3-63 lowercase alphanumeric characters or hyphens",
    ),
});

const updatePasswordSchema = z.object({
  password: z.string().min(4).max(128).nullable(),
});

import type { RedisClient } from "../../redis/client.js";

export function tunnelsRouter(db: Database, redis: RedisClient) {
  const router = Router();

  router.get(
    "/",
    asyncRoute(async (req, res) => {
      const tunnelsList = await listUserTunnels(db, req.userId!);
      res.json(tunnelsList);
    }),
  );

  router.post(
    "/",
    asyncRoute(async (req, res) => {
      const { subdomain } = createTunnelSchema.parse(req.body);
      const created = await createUserTunnel(db, req.userId!, subdomain);
      await invalidateUserKeyCache(db, redis, req.userId!);
      res.status(201).json(created);
    }),
  );

  router.delete(
    "/:id",
    asyncRoute(async (req, res) => {
      const id = z.uuid().parse(req.params.id);
      await deleteUserTunnel(db, redis, req.userId!, id);
      await invalidateUserKeyCache(db, redis, req.userId!);
      res.status(204).send();
    }),
  );

  router.patch(
    "/:id/password",
    asyncRoute(async (req, res) => {
      const id = z.uuid().parse(req.params.id);
      const { password } = updatePasswordSchema.parse(req.body);
      const result = await updateTunnelPassword(db, redis, req.userId!, id, password);
      res.json(result);
    }),
  );

  return router;
}
