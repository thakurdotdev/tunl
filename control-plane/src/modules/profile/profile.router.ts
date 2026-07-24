import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { asyncRoute } from "../../platform/http.js";
import {
  disable2FA,
  getUserProfile,
  setup2FA,
  updateAllowedIps,
  updateUserProfileName,
  verify2FA,
} from "./profile.service.js";

const updateNameSchema = z.object({
  name: z.string().max(100),
});

const codeSchema = z.object({
  code: z.string().length(6, "2FA code must be exactly 6 digits"),
});

const ipWhitelistSchema = z.object({
  allowedIps: z.array(z.string()),
  enabled: z.boolean().default(false),
});

export function createProfileRouter(db: Database, jwtSecret: string): Router {
  const router = Router();

  router.get(
    "/",
    asyncRoute(async (req: Request, res: Response) => {
      const userId = req.userId!;
      const profile = await getUserProfile(db, userId);
      res.json(profile);
    }),
  );

  router.patch(
    "/",
    asyncRoute(async (req: Request, res: Response) => {
      const userId = req.userId!;
      const { name } = updateNameSchema.parse(req.body);
      const updated = await updateUserProfileName(db, userId, name);
      res.json(updated);
    }),
  );

  router.post(
    "/2fa/setup",
    asyncRoute(async (req: Request, res: Response) => {
      const userId = req.userId!;
      const result = await setup2FA(db, userId, jwtSecret);
      res.json(result);
    }),
  );

  router.post(
    "/2fa/verify",
    asyncRoute(async (req: Request, res: Response) => {
      const userId = req.userId!;
      const { code } = codeSchema.parse(req.body);
      const result = await verify2FA(db, userId, code, jwtSecret);
      res.json(result);
    }),
  );

  router.post(
    "/2fa/disable",
    asyncRoute(async (req: Request, res: Response) => {
      const userId = req.userId!;
      const result = await disable2FA(db, userId);
      res.json(result);
    }),
  );

  router.patch(
    "/ip-whitelist",
    asyncRoute(async (req: Request, res: Response) => {
      const userId = req.userId!;
      const { allowedIps, enabled } = ipWhitelistSchema.parse(req.body);
      const updated = await updateAllowedIps(db, userId, allowedIps, enabled);
      res.json(updated);
    }),
  );

  return router;
}
