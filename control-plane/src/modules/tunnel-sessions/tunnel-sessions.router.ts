import { Router } from "express";
import type { Database } from "../../db/client.js";
import { asyncRoute } from "../../platform/http.js";
import { listActiveTunnelSessions } from "./tunnel-sessions.service.js";

export function tunnelSessionsRouter(db: Database) {
  const router = Router();

  router.get(
    "/",
    asyncRoute(async (req, res) => {
      const sessions = await listActiveTunnelSessions(db, req.userId!);
      console.log(`[v1/tunnel-sessions] userId=${req.userId} found=${sessions.length} session(s)`);
      res.json(sessions);
    }),
  );

  return router;
}
