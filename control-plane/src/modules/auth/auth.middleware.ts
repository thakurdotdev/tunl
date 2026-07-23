import type { RequestHandler } from "express";
import type { Config } from "../../platform/config.js";
import { unauthorized } from "../../platform/errors.js";
import { asyncRoute } from "../../platform/http.js";
import { verifyAccessToken } from "./token.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
export const requireAuth = (config: Config): RequestHandler =>
  asyncRoute(async (req, _res, next) => {
    const headerValue = req.header("authorization");
    let token: string | undefined;

    if (headerValue?.startsWith("Bearer ")) {
      token = headerValue.slice(7);
    } else if (typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) throw unauthorized();
    req.userId = await verifyAccessToken(config, token);
    next();
  });
