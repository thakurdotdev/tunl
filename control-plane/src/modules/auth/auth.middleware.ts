import type { RequestHandler } from "express";
import type { Config } from "../../platform/config.js";
import { unauthorized } from "../../platform/errors.js";
import { asyncRoute } from "../../platform/http.js";
import { auth } from "../../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth = (_config?: Config): RequestHandler =>
  asyncRoute(async (req, _res, next) => {
    try {
      const headers = fromNodeHeaders(req.headers);
      const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
      if (queryToken && !headers.get("authorization")) {
        headers.set("authorization", `Bearer ${queryToken}`);
      }

      const session = await auth.api.getSession({
        headers,
      });
      if (session?.user?.id) {
        req.userId = session.user.id;
        return next();
      }
    } catch {
      // Session fetch error
    }

    throw unauthorized();
  });
