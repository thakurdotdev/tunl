import { randomBytes } from "node:crypto";
import { and, count, desc, eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { customDomains, plans, sshKeys, tunnels, user } from "../../db/schema.js";
import { badRequest, conflict, forbidden, notFound } from "../../platform/errors.js";
import type { RedisClient } from "../../redis/client.js";
import { redisKeys } from "../../redis/keys.js";
import {
  bustCustomDomainCache,
  dnsInstructions,
  isBaseDomainOrSubdomain,
  normalizeDomain,
} from "./domain-utils.js";

export async function listUserCustomDomains(db: Database, userId: string, baseDomain: string) {
  const rows = await db
    .select({
      id: customDomains.id,
      domain: customDomains.domain,
      tunnelId: customDomains.tunnelId,
      subdomain: tunnels.subdomain,
      status: customDomains.status,
      verificationToken: customDomains.verificationToken,
      verifiedAt: customDomains.verifiedAt,
      lastCheckedAt: customDomains.lastCheckedAt,
      createdAt: customDomains.createdAt,
    })
    .from(customDomains)
    .innerJoin(tunnels, eq(tunnels.id, customDomains.tunnelId))
    .where(eq(customDomains.userId, userId))
    .orderBy(desc(customDomains.createdAt));
  return rows.map((r) => ({
    id: r.id,
    domain: r.domain,
    tunnelId: r.tunnelId,
    subdomain: r.subdomain,
    status: r.status,
    verifiedAt: r.verifiedAt,
    lastCheckedAt: r.lastCheckedAt,
    createdAt: r.createdAt,
    dns: dnsInstructions(r.domain, r.verificationToken, baseDomain),
  }));
}

export async function createUserCustomDomain(
  db: Database,
  redis: RedisClient,
  userId: string,
  rawDomain: string,
  tunnelId: string,
  baseDomain: string,
) {
  const domainLower = normalizeDomain(rawDomain);
  if (isBaseDomainOrSubdomain(domainLower, baseDomain)) {
    throw badRequest(`Domains under ${baseDomain} are managed as subdomains`);
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [tunnel] = await tx
        .select({ id: tunnels.id, subdomain: tunnels.subdomain })
        .from(tunnels)
        .where(and(eq(tunnels.id, tunnelId), eq(tunnels.userId, userId)))
        .limit(1);
      if (!tunnel) throw notFound("tunnel not found");

      const [userPlan] = await tx
        .select({ max: plans.maxCustomDomains })
        .from(user)
        .leftJoin(plans, eq(user.planId, plans.id))
        .where(eq(user.id, userId))
        .limit(1);
      const maxDomains = userPlan?.max ?? 1;
      const [{ value }] = await tx
        .select({ value: count() })
        .from(customDomains)
        .where(eq(customDomains.userId, userId));
      if (value >= maxDomains) {
        throw forbidden(`your plan allows at most ${maxDomains} custom domain(s)`);
      }

      // 1 tunnel = 1 custom domain.
      const [tunnelTaken] = await tx
        .select({ id: customDomains.id })
        .from(customDomains)
        .where(eq(customDomains.tunnelId, tunnel.id))
        .limit(1);
      if (tunnelTaken) throw conflict("tunnel already has a custom domain");

      const [existing] = await tx
        .select({ id: customDomains.id })
        .from(customDomains)
        .where(eq(customDomains.domainLower, domainLower))
        .limit(1);
      if (existing) throw conflict("domain is already registered");

      const token = randomBytes(24).toString("hex");
      const [row] = await tx
        .insert(customDomains)
        .values({
          userId,
          tunnelId: tunnel.id,
          domain: domainLower,
          domainLower,
          verificationToken: token,
        })
        .returning({
          id: customDomains.id,
          domain: customDomains.domain,
          tunnelId: customDomains.tunnelId,
          status: customDomains.status,
          verificationToken: customDomains.verificationToken,
          createdAt: customDomains.createdAt,
        });

      return { row, subdomain: tunnel.subdomain };
    });

    return {
      id: created.row.id,
      domain: created.row.domain,
      tunnelId: created.row.tunnelId,
      subdomain: created.subdomain,
      status: created.row.status,
      createdAt: created.row.createdAt,
      dns: dnsInstructions(created.row.domain, created.row.verificationToken, baseDomain),
    };
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("domain is already registered");
    throw error;
  }
}

export async function deleteUserCustomDomain(
  db: Database,
  redis: RedisClient,
  userId: string,
  id: string,
) {
  const [deleted] = await db
    .delete(customDomains)
    .where(and(eq(customDomains.id, id), eq(customDomains.userId, userId)))
    .returning({ id: customDomains.id, domainLower: customDomains.domainLower });
  if (!deleted) throw notFound("custom domain not found");
  await bustCustomDomainCache(redis, deleted.domainLower);
  await bustValidateKeyCache(db, redis, userId);
}

async function bustValidateKeyCache(db: Database, redis: RedisClient, userId: string) {
  // validate-key responses embed verified domains for the SSH Online banner.
  const keys = await db
    .select({ fingerprint: sshKeys.fingerprint })
    .from(sshKeys)
    .where(eq(sshKeys.userId, userId));
  for (const k of keys) {
    await redis.del(redisKeys.validateKey(k.fingerprint)).catch(() => 0);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
