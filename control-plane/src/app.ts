import express from "express";
import helmet from "helmet";
import { sql } from "drizzle-orm";
import type { Database } from "./db/client.js";
import type { Config } from "./platform/config.js";
import type { RedisClient } from "./redis/client.js";
import { errorHandler, requestContext } from "./platform/http.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import { internalRouter, startStaleSessionSweeper } from "./modules/internal/internal.router.js";
import { inspectRouter } from "./modules/inspect/inspect.router.js";
import { sshKeysRouter } from "./modules/ssh-keys/ssh-keys.router.js";
import { tunnelsRouter } from "./modules/tunnels/tunnels.router.js";
import { tunnelSessionsRouter } from "./modules/tunnel-sessions/tunnel-sessions.router.js";
import { createAdminRouter } from "./modules/admin/admin.router.js";
import { createProfileRouter } from "./modules/profile/profile.router.js";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

export function createApp(db: Database, redis: RedisClient, config: Config) {
  const app = express();

  // Trust proxy headers for reverse proxies and SSH tunnels (X-Forwarded-Proto, X-Forwarded-Host)
  app.set("trust proxy", true);
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          origin === config.DASHBOARD_URL ||
          origin.endsWith(".tunl.online") ||
          origin.includes("localhost")
        ) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    }),
  );

  app.use(helmet());

  // Support both /api/auth/* and stripped Nginx proxy /auth/* routes
  app.use((req, _res, next) => {
    if (req.url.startsWith("/auth")) {
      req.url = "/api" + req.url;
    }
    next();
  });

  // Mount Better Auth BEFORE express.json body parser (Express v5 catch-all path syntax)
  app.all("/api/auth/{*any}", toNodeHandler(auth));

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

  app.use("/v1", requireAuth(config));
  app.use("/v1/profile", createProfileRouter(db, redis, config.JWT_SECRET));
  app.use("/v1/admin", createAdminRouter(db));
  app.use("/v1/ssh-keys", sshKeysRouter(db, redis));
  app.use("/v1/tunnels", tunnelsRouter(db, redis));
  app.use("/v1/tunnel-sessions", tunnelSessionsRouter(db));
  app.use("/v1/inspect", inspectRouter(db, redis, config));
  app.use("/internal", internalRouter(db, redis, config));
  app.use(errorHandler);

  // run every 60s to clear stale sessions
  startStaleSessionSweeper(db);

  return app;
}
