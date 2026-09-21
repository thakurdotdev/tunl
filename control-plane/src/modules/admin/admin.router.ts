import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { asyncRoute } from "../../platform/http.js";
import { requireAdmin } from "./admin.middleware.js";
import {
  createAdminPlan,
  getAdminAnalytics,
  getAdminAuditEvents,
  getAdminBandwidthAnalytics,
  getAdminPlans,
  getAdminUsers,
  updateUserPlan,
  updateUserRole,
} from "./admin.service.js";

const bandwidthQuerySchema = z.object({
  period: z.enum(["24h", "7d", "30d"]).default("24h"),
});

const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  eventType: z.enum(["all", "tunnel.connected", "tunnel.disconnected"]).default("all"),
});

const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  search: z.string().optional(),
  role: z.enum(["all", "admin", "user"]).default("all"),
  planId: z.string().optional(),
  sortBy: z.enum(["createdAt", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const updatePlanSchema = z.object({
  planId: z.uuid("Invalid planId format"),
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
    "/analytics/bandwidth",
    asyncRoute(async (req: Request, res: Response) => {
      const { period } = bandwidthQuerySchema.parse(req.query);
      const data = await getAdminBandwidthAnalytics(db, period);
      res.json(data);
    }),
  );

  router.get(
    "/audit",
    asyncRoute(async (req: Request, res: Response) => {
      const query = auditQuerySchema.parse(req.query);
      const data = await getAdminAuditEvents(db, query);
      res.json(data);
    }),
  );

  router.get(
    "/users",
    asyncRoute(async (req: Request, res: Response) => {
      const query = usersQuerySchema.parse(req.query);
      const data = await getAdminUsers(db, query);
      res.json(data);
    }),
  );

  router.patch(
    "/users/:userId/plan",
    asyncRoute(async (req: Request, res: Response) => {
      const { planId } = updatePlanSchema.parse(req.body);
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const result = await updateUserPlan(db, userId, planId);
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
