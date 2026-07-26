import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { user } from "../../db/schema.js";
import { forbidden, unauthorized } from "../../platform/errors.js";

export function requireAdmin(db: Database) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(unauthorized("Authentication required"));
    }

    const [u] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, req.userId))
      .limit(1);

    if (!u || u.role !== "admin") {
      return next(forbidden("Admin access required"));
    }

    next();
  };
}
