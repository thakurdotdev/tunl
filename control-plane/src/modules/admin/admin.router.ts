import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { asyncRoute } from "../../platform/http.js";
import { requireAdmin } from "./admin.middleware.js";
import {
  createAdminPlan,
  getAdminAnalytics,
  getAdminPlans,
  getAdminUsers,
  updateUserPlan,
  updateUserRole,
} from "./admin.service.js";

const updatePlanSchema = z.object({
  planName: z.string().min(1),
});

const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

const createPlanSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Plan name must be lowercase alphanumeric and hyphens"),
  maxReservedSubdomains: z.number().int().min(1),
  maxActiveTunnels: z.number().int().min(1),
  isDefault: z.boolean().optional(),
});

export function createAdminRouter(db: Database): Router {
  const router = Router();

  router.use(requireAdmin(db));

  router.get(
    "/analytics",
    asyncRoute(async (_req: Request, res: Response) => {
      const data = await getAdminAnalytics(db);
      res.json(data);
    }),
  );

  router.get(
    "/users",
    asyncRoute(async (req: Request, res: Response) => {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const usersList = await getAdminUsers(db, search);
      res.json(usersList);
    }),
  );

  router.patch(
    "/users/:userId/plan",
    asyncRoute(async (req: Request, res: Response) => {
      const { planName } = updatePlanSchema.parse(req.body);
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const result = await updateUserPlan(db, userId, planName);
      res.json(result);
    }),
  );

  router.patch(
    "/users/:userId/role",
    asyncRoute(async (req: Request, res: Response) => {
      const { role } = updateRoleSchema.parse(req.body);
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const result = await updateUserRole(db, userId, role);
      res.json(result);
    }),
  );

  router.get(
    "/plans",
    asyncRoute(async (_req: Request, res: Response) => {
      const plansList = await getAdminPlans(db);
      res.json(plansList);
    }),
  );

  router.post(
    "/plans",
    asyncRoute(async (req: Request, res: Response) => {
      const payload = createPlanSchema.parse(req.body);
      const newPlan = await createAdminPlan(db, payload);
      res.status(201).json(newPlan);
    }),
  );

  return router;
}
