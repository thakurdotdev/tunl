import { domainToASCII } from "node:url";
import { badRequest } from "../../platform/errors.js";
import type { RedisClient } from "../../redis/client.js";
import { redisKeys } from "../../redis/keys.js";

const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  if (value.endsWith(".")) value = value.slice(0, -1);
  if (!value) throw badRequest("Domain is required");
  if (value.length > 253) throw badRequest("Domain is too long (max 253 characters)");
  let ascii: string;
  try {
    ascii = domainToASCII(value);
  } catch {
    throw badRequest("Domain contains invalid characters");
  }
  if (!ascii) {
    throw badRequest("Domain contains invalid characters");
  }
  if (ascii.length > 253) throw badRequest("Domain is too long (max 253 characters)");
  if (ascii.includes("..") || ascii.includes(" ") || ascii.includes("/")) {
    throw badRequest("Domain is not a valid hostname");
  }
  if (IPV4_RE.test(ascii) || ascii.includes(":")) {
    throw badRequest("Domain must be a hostname, not an IP address");
  }
  const labels = ascii.split(".");
  if (labels.length < 2) throw badRequest("Domain must include a TLD (e.g. app.example.com)");
  for (const label of labels) {
    if (!HOSTNAME_LABEL.test(label)) throw badRequest(`Invalid domain label: '${label}'`);
  }
  return ascii;
}

export function isBaseDomainOrSubdomain(domainLower: string, baseDomain: string): boolean {
  const base = baseDomain.trim().toLowerCase().replace(/\.*$/, "");
  if (!base) return false;
  return domainLower === base || domainLower.endsWith(`.${base}`);
}

// Common multi-part public suffixes so we can tell that
// app.example.co.uk lives in zone example.co.uk, not co.uk.
const MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "net.uk",
  "gov.uk",
  "ac.uk",
  "me.uk",
  "com.au",
  "net.au",
  "org.au",
  "edu.au",
  "gov.au",
  "co.nz",
  "net.nz",
  "org.nz",
  "co.jp",
  "ne.jp",
  "or.jp",
  "com.br",
  "com.mx",
  "co.in",
  "co.za",
  "com.sg",
  "com.hk",
  "com.tw",
]);

/** Split a hostname into its zone (apex) and the labels left over. */
export function splitZone(domainLower: string): { zone: string; relativeHost: string } {
  const labels = domainLower.split(".");
  if (labels.length <= 2) return { zone: domainLower, relativeHost: "" };
  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_TLDS.has(lastTwo) && labels.length >= 3) {
    return { zone: labels.slice(-3).join("."), relativeHost: labels.slice(0, -3).join(".") };
  }
  return { zone: lastTwo, relativeHost: labels.slice(0, -2).join(".") };
}

/**
 * Build the DNS records a user must create, in the shape registrars expect:
 * a short "name" relative to the zone (Cloudflare/Namecheap/Route53 all
 * accept this), plus the full FQDN for providers that require it.
 */
export function dnsInstructions(domain: string, token: string, baseDomain: string) {
  const host = domain.toLowerCase().replace(/\.*$/, "");
  const { zone, relativeHost } = splitZone(host);
  const canonicalTarget = `cname.${baseDomain}`;
  return {
    zone,
    cname: {
      type: "CNAME",
      name: relativeHost === "" ? "@" : relativeHost,
      fullName: host,
      value: canonicalTarget,
    },
    txt: {
      type: "TXT",
      name: relativeHost === "" ? "_tunl-challenge" : `_tunl-challenge.${relativeHost}`,
      fullName: `_tunl-challenge.${host}`,
      value: token,
    },
  };
}

export function bustCustomDomainCache(redis: RedisClient, domainLower: string) {
  return Promise.all([
    redis.del(redisKeys.customDomain(domainLower)).catch(() => 0),
    redis
      .publish("tunl:custom-domains-updated", JSON.stringify({ host: domainLower }))
      .catch(() => 0),
  ]);
}
