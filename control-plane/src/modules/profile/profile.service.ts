import net from "node:net";
import { eq } from "drizzle-orm";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import type { Database } from "../../db/client.js";
import type { RedisClient } from "../../redis/client.js";
import { redisKeys } from "../../redis/keys.js";
import { plans, sshKeys, user } from "../../db/schema.js";
import { decryptSecret, encryptSecret } from "../../lib/crypto.js";
import { badRequest, notFound, unauthorized } from "../../platform/errors.js";

function isValidIpOrCidr(input: string): boolean {
  const trimmed = input.trim();
  if (net.isIP(trimmed) !== 0) return true;

  const parts = trimmed.split("/");
  if (parts.length === 2) {
    const ip = parts[0];
    const mask = parseInt(parts[1], 10);
    if (net.isIPv4(ip) && !isNaN(mask) && mask >= 0 && mask <= 32) return true;
    if (net.isIPv6(ip) && !isNaN(mask) && mask >= 0 && mask <= 128) return true;
  }

  return false;
}

export async function getUserProfile(db: Database, userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      ipWhitelistEnabled: user.ipWhitelistEnabled,
      allowedIps: user.allowedIps,
      planName: plans.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .leftJoin(plans, eq(user.planId, plans.id))
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) {
    throw notFound("User profile not found");
  }

  return {
    ...row,
    planName: row.planName || "free",
  };
}

export async function updateUserProfileName(db: Database, userId: string, name: string) {
  const trimmed = name.trim();
  const [updated] = await db
    .update(user)
    .set({ name: trimmed.length > 0 ? trimmed : null, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id, name: user.name });

  if (!updated) {
    throw notFound("User not found");
  }

  return updated;
}

export async function setup2FA(db: Database, userId: string, jwtSecret: string) {
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!u) {
    throw notFound("User not found");
  }

  const secret = generateSecret();
  const otpAuthUrl = generateURI({ issuer: "tunl", label: u.email, secret });
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

  const encryptedSecret = encryptSecret(secret, jwtSecret);

  await db
    .update(user)
    .set({
      twoFactorSecret: encryptedSecret,
      twoFactorEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  return { secret, qrCodeDataUrl };
}

export async function verify2FA(db: Database, userId: string, code: string, jwtSecret: string) {
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!u || !u.twoFactorSecret) {
    throw badRequest("2FA setup not initiated for this account");
  }

  let plainSecret = "";
  try {
    plainSecret = decryptSecret(u.twoFactorSecret, jwtSecret);
  } catch {
    throw badRequest("Failed to decrypt 2FA secret");
  }

  const result = await verify({ token: code.trim(), secret: plainSecret });
  if (!result || !result.valid) {
    throw unauthorized("Invalid 2FA verification code");
  }

  await db
    .update(user)
    .set({ twoFactorEnabled: true, updatedAt: new Date() })
    .where(eq(user.id, userId));

  return { success: true, message: "Two-Factor Authentication successfully enabled" };
}

export async function disable2FA(db: Database, userId: string) {
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!u || !u.twoFactorEnabled) {
    throw badRequest("2FA is not enabled on this account");
  }

  await db
    .update(user)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  return { success: true, message: "Two-Factor Authentication disabled" };
}

export async function updateAllowedIps(
  db: Database,
  redis: RedisClient,
  userId: string,
  rawIps: string[],
  ipWhitelistEnabled: boolean,
) {
  const sanitizedIps: string[] = [];

  for (const item of rawIps) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    if (!isValidIpOrCidr(trimmed)) {
      throw badRequest(`Invalid IP or CIDR block format: '${trimmed}'`);
    }

    if (!sanitizedIps.includes(trimmed)) {
      sanitizedIps.push(trimmed);
    }
  }

  const [updated] = await db
    .update(user)
    .set({
      allowedIps: sanitizedIps,
      ipWhitelistEnabled,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning({
      id: user.id,
      allowedIps: user.allowedIps,
      ipWhitelistEnabled: user.ipWhitelistEnabled,
    });

  if (!updated) {
    throw notFound("User not found");
  }

  const keys = await db
    .select({ fingerprint: sshKeys.fingerprint })
    .from(sshKeys)
    .where(eq(sshKeys.userId, userId));
  for (const k of keys) {
    await redis.del(redisKeys.validateKey(k.fingerprint));
  }

  const effectiveIps = ipWhitelistEnabled ? sanitizedIps : [];
  await redis.publish("tunl:user-ip-updated", JSON.stringify({ userId, allowedIps: effectiveIps }));

  return updated;
}
