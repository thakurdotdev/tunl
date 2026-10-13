import { createHash } from "node:crypto";

const PREFIX = "tunl:control-plane";
const segment = (value: string) =>
  createHash("sha256").update(value).digest("base64url").slice(0, 24);

// Redis keys for this service belong here. Never concatenate project keys at call sites.
export const redisKeys = {
  authRateLimit: (action: string, ip: string) =>
    `${PREFIX}:auth-rate-limit:${action}:${segment(ip)}`,
  validateKey: (fingerprint: string) => `${PREFIX}:validate-key:${segment(fingerprint)}`,
  customDomain: (host: string) => `${PREFIX}:custom-domain:${segment(host.toLowerCase())}`,
  customDomainVerify: (domainId: string, ip: string) =>
    `${PREFIX}:custom-domain-verify:${segment(domainId)}:${segment(ip)}`,
};
