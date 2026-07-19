import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  INTERNAL_SHARED_SECRET: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(3001),
  JWT_ISSUER: z.string().default("tunl-control-plane"),
  JWT_AUDIENCE: z.string().default("tunl-dashboard"),
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().min(3).max(320),
  DASHBOARD_URL: z.url(),
});

export type Config = z.infer<typeof envSchema>;
export function loadConfig(env = process.env): Config {
  return envSchema.parse(env);
}
