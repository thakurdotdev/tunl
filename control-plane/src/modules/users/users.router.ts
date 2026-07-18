import { Router } from "express";
import type { Database } from "../../db/client.js";
import { asyncRoute } from "../../platform/http.js";
import { getProfile } from "../auth/auth.service.js";

export function usersRouter(db: Database) {
  const router = Router();
  router.get(
    "/me",
    asyncRoute(async (req, res) => res.json(await getProfile(db, req.userId!))),
  );
  return router;
}
