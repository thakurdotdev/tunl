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
    const value = req.header("authorization");
    if (!value?.startsWith("Bearer ")) throw unauthorized();
    req.userId = await verifyAccessToken(config, value.slice(7));
    next();
  });
