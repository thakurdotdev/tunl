import dns from "node:dns/promises";
import { and, eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { customDomains, tunnels } from "../../db/schema.js";
import { notFound } from "../../platform/errors.js";
import type { RedisClient } from "../../redis/client.js";
import { bustCustomDomainCache, dnsInstructions, isBaseDomainOrSubdomain } from "./domain-utils.js";

export type DnsLookup = {
  resolveTxt(host: string): Promise<string[][]>;
  resolveCname(host: string): Promise<string[]>;
};

const defaultDns: DnsLookup = {
  resolveTxt: (host) => dns.resolveTxt(host),
  resolveCname: (host) => dns.resolveCname(host),
};

export async function verifyUserCustomDomain(
  db: Database,
  redis: RedisClient,
  userId: string,
  id: string,
  baseDomain: string,
  lookup: DnsLookup = defaultDns,
) {
  const [row] = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.id, id), eq(customDomains.userId, userId)))
    .limit(1);
  if (!row) throw notFound("custom domain not found");

  const expectedTxt = row.verificationToken;
  const challengeHost = `_tunl-challenge.${row.domainLower}`;
  let txtOk = false;
  let cnameOk = false;
  let detail = "";

  try {
    const txtRecords = await lookup.resolveTxt(challengeHost);
    txtOk = txtRecords.flat().some((r) => r.trim() === expectedTxt);
    if (!txtOk) detail = `TXT record at ${challengeHost} does not match yet`;
  } catch (err: unknown) {
    detail = dnsErrorDetail(err, `no TXT record found at ${challengeHost} yet`);
  }

  if (!txtOk) {
    try {
      const cnames = await lookup.resolveCname(row.domainLower);
      const canonical = `cname.${baseDomain}`.toLowerCase().replace(/\.*$/, "");
      cnameOk = cnames.some((c) => {
        const cLower = c.toLowerCase().replace(/\.*$/, "");
        return (
          cLower === canonical ||
          cLower.endsWith(`.${baseDomain.toLowerCase()}`)
        );
      });
      if (!cnameOk) {
        detail = detail
          ? `${detail} (CNAME does not point to ${canonical} yet)`
          : `CNAME for ${row.domain} does not point to ${canonical} yet`;
      }
    } catch (err: unknown) {
      const cnameErr = dnsErrorDetail(err, `no CNAME found for ${row.domain} yet`);
      detail = detail ? `${detail} (${cnameErr})` : cnameErr;
    }
  } else {
    cnameOk = true;
  }

  const verified = txtOk || cnameOk;
  const [updated] = await db
    .update(customDomains)
    .set({
      status: verified ? "verified" : "failed",
      verifiedAt: verified ? new Date() : row.verifiedAt,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(customDomains.id, row.id))
    .returning({
      id: customDomains.id,
      domain: customDomains.domain,
      status: customDomains.status,
      verifiedAt: customDomains.verifiedAt,
      lastCheckedAt: customDomains.lastCheckedAt,
    });

  if (verified) await bustCustomDomainCache(redis, row.domainLower);

  return {
    ...updated,
    verified,
    dns: dnsInstructions(row.domain, row.verificationToken, baseDomain),
    detail: verified ? "domain verified" : detail,
  };
}

/** Resolve a public host to its live subdomain. Only verified rows route. */
export async function resolveCustomDomain(
  db: Database,
  host: string,
): Promise<{ subdomain: string; userId: string } | null> {
  const domainLower = host.trim().toLowerCase().replace(/\.*$/, "");
  if (!domainLower) return null;
  const [row] = await db
    .select({ subdomain: tunnels.subdomain, userId: customDomains.userId })
    .from(customDomains)
    .innerJoin(tunnels, eq(tunnels.id, customDomains.tunnelId))
    .where(and(eq(customDomains.domainLower, domainLower), eq(customDomains.status, "verified")))
    .limit(1);
  return row ?? null;
}

export function resolveCustomDomainGuard(host: string, baseDomain: string): boolean {
  return !isBaseDomainOrSubdomain(host.trim().toLowerCase().replace(/\.*$/, ""), baseDomain);
}

function dnsErrorDetail(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (code === "ENOTFOUND" || code === "ENODATA") return fallback;
    return `${fallback} (${code})`;
  }
  return fallback;
}
