import { and, count, desc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { plans, tunnels, users } from "../../db/schema.js";
import { conflict, forbidden, notFound } from "../../platform/errors.js";
import { asyncRoute } from "../../platform/http.js";

const createTunnel = z.object({
  subdomain: z
    .string()
    .regex(
      /^[a-z0-9-]{3,63}$/,
      "Subdomain must be 3-63 lowercase alphanumeric characters or hyphens",
    ),
});
const output = {
  id: tunnels.id,
  subdomain: tunnels.subdomain,
  status: tunnels.status,
  lastConnectedAt: tunnels.lastConnectedAt,
  createdAt: tunnels.createdAt,
};
export function tunnelsRouter(db: Database) {
  const router = Router();
  router.get(
    "/",
    asyncRoute(async (req, res) =>
      res.json(
        await db
          .select(output)
          .from(tunnels)
          .where(eq(tunnels.userId, req.userId!))
          .orderBy(desc(tunnels.createdAt)),
      ),
    ),
  );
  router.post(
    "/",
    asyncRoute(async (req, res) => {
      const { subdomain } = createTunnel.parse(req.body);
      try {
        const created = await db.transaction(async (tx) => {
          await tx.execute(sql`select id from users where id = ${req.userId!} for update`);
          const [user] = await tx
            .select({ max: plans.maxReservedSubdomains })
            .from(users)
            .innerJoin(plans, eq(users.planId, plans.id))
            .where(eq(users.id, req.userId!))
            .limit(1);
          if (!user) throw notFound("user not found");
          const [{ value }] = await tx
            .select({ value: count() })
            .from(tunnels)
            .where(eq(tunnels.userId, req.userId!));
          if (value >= user.max)
            throw forbidden(`your plan allows at most ${user.max} reserved subdomain(s)`);
          const [tunnel] = await tx
            .insert(tunnels)
            .values({ userId: req.userId!, subdomain })
            .returning(output);
          return tunnel;
        });
        res.status(201).json(created);
      } catch (error) {
        if (isUniqueViolation(error)) throw conflict("subdomain is already reserved");
        throw error;
      }
    }),
  );
  router.delete(
    "/:id",
    asyncRoute(async (req, res) => {
      const id = z.string().uuid().parse(req.params.id);
      const deleted = await db
        .delete(tunnels)
        .where(and(eq(tunnels.id, id), eq(tunnels.userId, req.userId!)))
        .returning({ id: tunnels.id });
      if (!deleted.length) throw notFound("tunnel not found");
      res.status(204).send();
    }),
  );
  return router;
}
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
