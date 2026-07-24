import net from "node:net";
import { eq } from "drizzle-orm";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import type { Database } from "../../db/client.js";
import { plans, users } from "../../db/schema.js";
import { decryptSecret, encryptSecret } from "../../lib/crypto.js";
import { badRequest, notFound, unauthorized } from "../../platform/errors.js";

function isValidIpOrCidr(input: string): boolean {
  const trimmed = input.trim();
  if (net.isIP(trimmed) !== 0) return true;

  // Check CIDR format (e.g. 192.168.1.0/24 or 10.0.0.0/8)
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
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      twoFactorEnabled: users.twoFactorEnabled,
      ipWhitelistEnabled: users.ipWhitelistEnabled,
      allowedIps: users.allowedIps,
      planName: plans.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(plans, eq(users.planId, plans.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    throw notFound("User profile not found");
  }

  return row;
}

export async function updateUserProfileName(db: Database, userId: string, name: string) {
  const trimmed = name.trim();
  const [updated] = await db
    .update(users)
    .set({ name: trimmed.length > 0 ? trimmed : null, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, name: users.name });

  if (!updated) {
    throw notFound("User not found");
  }

  return updated;
}

export async function setup2FA(db: Database, userId: string, jwtSecret: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw notFound("User not found");
  }

  // Generate plain secret and otpauth URI using otplib
  const secret = generateSecret();
  const otpAuthUrl = generateURI({ issuer: "tunl", label: user.email, secret });
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

  // Encrypt secret using AES-256-GCM before storing in database
  const encryptedSecret = encryptSecret(secret, jwtSecret);

  await db
    .update(users)
    .set({
      twoFactorSecret: encryptedSecret,
      twoFactorEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { secret, qrCodeDataUrl };
}

export async function verify2FA(db: Database, userId: string, code: string, jwtSecret: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.twoFactorSecret) {
    throw badRequest("2FA setup not initiated for this account");
  }

  let plainSecret = "";
  try {
    plainSecret = decryptSecret(user.twoFactorSecret, jwtSecret);
  } catch {
    throw badRequest("Failed to decrypt 2FA secret");
  }

  const result = await verify({ token: code.trim(), secret: plainSecret });
  if (!result || !result.valid) {
    throw unauthorized("Invalid 2FA verification code");
  }

  await db
    .update(users)
    .set({ twoFactorEnabled: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { success: true, message: "Two-Factor Authentication successfully enabled" };
}

export async function disable2FA(db: Database, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.twoFactorEnabled) {
    throw badRequest("2FA is not enabled on this account");
  }

  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true, message: "Two-Factor Authentication disabled" };
}

export async function updateAllowedIps(
  db: Database,
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
    .update(users)
    .set({
      allowedIps: sanitizedIps,
      ipWhitelistEnabled,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      allowedIps: users.allowedIps,
      ipWhitelistEnabled: users.ipWhitelistEnabled,
    });

  if (!updated) {
    throw notFound("User not found");
  }

  return updated;
}
