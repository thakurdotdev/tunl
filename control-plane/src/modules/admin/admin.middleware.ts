import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { forbidden, unauthorized } from "../../platform/errors.js";

export function requireAdmin(db: Database) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next(unauthorized("Authentication required"));
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.userId))
      .limit(1);

    if (!user || user.role !== "admin") {
      return next(forbidden("Admin access required"));
    }

    next();
  };
}
