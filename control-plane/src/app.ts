import express from "express";
import helmet from "helmet";
import { sql } from "drizzle-orm";
import type { Database } from "./db/client.js";
import type { Config } from "./platform/config.js";
import type { RedisClient } from "./redis/client.js";
import { RedisRateLimitStore } from "./platform/rate-limit.js";
import { errorHandler, requestContext } from "./platform/http.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { ResendAuthMailer } from "./modules/auth/mailer.js";
import { internalRouter, startStaleSessionSweeper } from "./modules/internal/internal.router.js";
import { inspectRouter } from "./modules/inspect/inspect.router.js";
import { sshKeysRouter } from "./modules/ssh-keys/ssh-keys.router.js";
import { tunnelsRouter } from "./modules/tunnels/tunnels.router.js";
import { tunnelSessionsRouter } from "./modules/tunnel-sessions/tunnel-sessions.router.js";
import { createAdminRouter } from "./modules/admin/admin.router.js";
import { usersRouter } from "./modules/users/users.router.js";
import cors from "cors";

export function createApp(db: Database, redis: RedisClient, config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: config.DASHBOARD_URL, credentials: true }));
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));
  app.use(requestContext);
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/ready", async (_req, res, next) => {
    try {
      await db.execute(sql`select 1`);
      await redis.ping();
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  app.use(
    "/v1/auth",
    authRouter(db, config, new ResendAuthMailer(config), new RedisRateLimitStore(redis)),
  );
  app.use("/v1", requireAuth(config));
  app.use("/v1", usersRouter(db));
  app.use("/v1/admin", createAdminRouter(db));
  app.use("/v1/ssh-keys", sshKeysRouter(db, redis));
  app.use("/v1/tunnels", tunnelsRouter(db, redis));
  app.use("/v1/tunnel-sessions", tunnelSessionsRouter(db));
  app.use("/v1/inspect", inspectRouter(db, redis));
  app.use("/internal", internalRouter(db, redis, config));
  app.use(errorHandler);

  // run every 60s to clear stale sessions
  startStaleSessionSweeper(db);

  return app;
}
