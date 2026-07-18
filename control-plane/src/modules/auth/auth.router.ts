import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import type { Config } from "../../platform/config.js";
import { asyncRoute } from "../../platform/http.js";
import { rateLimit, type RateLimitStore } from "../../platform/rate-limit.js";
import {
  login,
  requestPasswordReset,
  requestVerification,
  resetPassword,
  signup,
  verifyEmail,
} from "./auth.service.js";
import type { AuthMailer } from "./mailer.js";
import { issueAccessToken } from "./token.js";

const credentials = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(128),
});
const emailInput = z.object({ email: z.string().trim().email().max(320) });
const tokenInput = z.object({ token: z.string().min(32).max(256) });
const resetInput = tokenInput.extend({ password: z.string().min(12).max(128) });
const genericMessage = { message: "If the account is eligible, an email will arrive shortly." };

export function authRouter(
  db: Database,
  config: Config,
  mailer: AuthMailer,
  rateLimitStore: RateLimitStore,
) {
  const router = Router();
  router.post(
    "/signup",
    rateLimit(rateLimitStore, "signup", 5, 60 * 60 * 1000),
    asyncRoute(async (req, res) => {
      const input = credentials.parse(req.body);
      const result = await signup(db, input.email, input.password);
      if (result.verificationToken)
        await mailer.sendVerification(input.email.trim().toLowerCase(), result.verificationToken);
      res.status(202).json(genericMessage);
    }),
  );
  router.post(
    "/login",
    rateLimit(rateLimitStore, "login", 10, 15 * 60 * 1000),
    asyncRoute(async (req, res) => {
      const input = credentials.parse(req.body);
      const user = await login(db, input.email, input.password);
      res.json({ accessToken: await issueAccessToken(config, user.id), user });
    }),
  );
  router.post(
    "/verify-email",
    rateLimit(rateLimitStore, "verify-email", 10, 60 * 60 * 1000),
    asyncRoute(async (req, res) => {
      await verifyEmail(db, tokenInput.parse(req.body).token);
      res.status(204).send();
    }),
  );
  router.post(
    "/resend-verification",
    rateLimit(rateLimitStore, "resend-verification", 5, 60 * 60 * 1000),
    asyncRoute(async (req, res) => {
      const result = await requestVerification(db, emailInput.parse(req.body).email);
      if (result) await mailer.sendVerification(result.email, result.token);
      res.status(202).json(genericMessage);
    }),
  );
  router.post(
    "/forgot-password",
    rateLimit(rateLimitStore, "forgot-password", 5, 60 * 60 * 1000),
    asyncRoute(async (req, res) => {
      const result = await requestPasswordReset(db, emailInput.parse(req.body).email);
      if (result) await mailer.sendPasswordReset(result.email, result.token);
      res.status(202).json(genericMessage);
    }),
  );
  router.post(
    "/reset-password",
    rateLimit(rateLimitStore, "reset-password", 10, 60 * 60 * 1000),
    asyncRoute(async (req, res) => {
      const input = resetInput.parse(req.body);
      await resetPassword(db, input.token, input.password);
      res.status(204).send();
    }),
  );
  return router;
}
