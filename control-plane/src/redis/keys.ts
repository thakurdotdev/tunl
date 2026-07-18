import { createHash } from "node:crypto";

const PREFIX = "tunl:control-plane";
const segment = (value: string) =>
  createHash("sha256").update(value).digest("base64url").slice(0, 24);

// Redis keys for this service belong here. Never concatenate project keys at call sites.
export const redisKeys = {
  authRateLimit: (action: string, ip: string) =>
    `${PREFIX}:auth-rate-limit:${action}:${segment(ip)}`,
};
