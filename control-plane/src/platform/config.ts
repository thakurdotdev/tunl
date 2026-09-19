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
  BETTER_AUTH_SECRET: z.string().default("replace-with-a-random-secret-at-least-32-characters"),
  BETTER_AUTH_URL: z.string().default("http://localhost:3001"),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  BASE_DOMAIN: z.string().default("tunl.online"),
  TUNNEL_URL_SCHEME: z.string().default("https"),
  TUNNEL_SERVER_HTTP_URL: z.string().default("http://localhost:8080"),
});

export type Config = z.infer<typeof envSchema>;
export function loadConfig(env = process.env): Config {
  return envSchema.parse(env);
}
