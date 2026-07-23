import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import type { Database } from "../../db/client.js";
import { accountTokens, plans, users } from "../../db/schema.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { AppError, badRequest, conflict, notFound } from "../../platform/errors.js";

export type PublicUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin";
  plan: { name: string; maxReservedSubdomains: number };
};
import { decryptSecret } from "../../lib/crypto.js";
import { verify } from "otplib";

type AuthRow = {
  id: string;
  email: string;
  passwordHash: string | null;
  role: "user" | "admin";
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  emailVerifiedAt: Date | null;
  planName: string;
  maxReservedSubdomains: number;
};
export const TOKEN_TTL_MINUTES = 15;
const TOKEN_TTL_MS = TOKEN_TTL_MINUTES * 60 * 1000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const newToken = () => randomBytes(32).toString("base64url");

const publicUser = (row: AuthRow): PublicUser => ({
  id: row.id,
  email: row.email,
  emailVerified: row.emailVerifiedAt !== null,
  role: row.role,
  plan: { name: row.planName, maxReservedSubdomains: row.maxReservedSubdomains },
});

async function getUserByEmail(db: Database, email: string): Promise<AuthRow | undefined> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      twoFactorEnabled: users.twoFactorEnabled,
      twoFactorSecret: users.twoFactorSecret,
      emailVerifiedAt: users.emailVerifiedAt,
      planName: plans.name,
      maxReservedSubdomains: plans.maxReservedSubdomains,
    })
    .from(users)
    .innerJoin(plans, eq(users.planId, plans.id))
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return row;
}

async function issueToken(
  db: Database,
  userId: string,
  type: "email_verification" | "password_reset",
) {
  const token = newToken();
  await db
    .delete(accountTokens)
    .where(and(eq(accountTokens.userId, userId), eq(accountTokens.type, type)));
  await db.insert(accountTokens).values({
    userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return token;
}

export async function signup(
  db: Database,
  email: string,
  password: string,
): Promise<{ verificationToken?: string }> {
  const normalized = normalizeEmail(email);
  const existing = await getUserByEmail(db, normalized);
  if (existing) throw conflict("An account with this email already exists");
  const [defaultPlan] = await db.select().from(plans).where(eq(plans.isDefault, true)).limit(1);
  if (!defaultPlan) throw new Error("default plan is not seeded");
  try {
    const [user] = await db
      .insert(users)
      .values({
        email: normalized,
        passwordHash: await hashPassword(password),
        planId: defaultPlan.id,
      })
      .returning({ id: users.id });
    return { verificationToken: await issueToken(db, user.id, "email_verification") };
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("An account with this email already exists");
    throw error;
  }
}

export async function login(
  db: Database,
  email: string,
  password: string,
  totpCode?: string,
  jwtSecret?: string,
): Promise<{ user?: PublicUser; requires2FA?: boolean }> {
  const row = await getUserByEmail(db, email);
  if (!row?.passwordHash || !(await verifyPassword(row.passwordHash, password)))
    throw badRequest("Invalid email or password");
  if (!row.emailVerifiedAt)
    throw new AppError(
      403,
      "email_not_verified",
      "Your email address is not verified. Please check your inbox or request a new verification link.",
    );

  if (row.twoFactorEnabled && row.twoFactorSecret) {
    if (!totpCode) {
      return { requires2FA: true };
    }

    if (!jwtSecret) {
      throw new Error("JWT secret required for 2FA decryption");
    }

    let plainSecret = "";
    try {
      plainSecret = decryptSecret(row.twoFactorSecret, jwtSecret);
    } catch {
      throw badRequest("Failed to decrypt 2FA secret");
    }

    const isValid = await verify({ token: totpCode.trim(), secret: plainSecret });
    if (!isValid || !isValid.valid) {
      throw badRequest("Invalid 2FA verification code");
    }
  }

  return { user: publicUser(row) };
}

export async function getProfile(db: Database, userId: string): Promise<PublicUser> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      twoFactorEnabled: users.twoFactorEnabled,
      twoFactorSecret: users.twoFactorSecret,
      emailVerifiedAt: users.emailVerifiedAt,
      planName: plans.name,
      maxReservedSubdomains: plans.maxReservedSubdomains,
    })
    .from(users)
    .innerJoin(plans, eq(users.planId, plans.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) throw notFound("user not found");
  return publicUser(row);
}

export async function requestVerification(db: Database, email: string) {
  const user = await getUserByEmail(db, email);
  return user && !user.emailVerifiedAt
    ? { email: user.email, token: await issueToken(db, user.id, "email_verification") }
    : undefined;
}

export async function requestPasswordReset(db: Database, email: string) {
  const user = await getUserByEmail(db, email);
  return user?.emailVerifiedAt
    ? { email: user.email, token: await issueToken(db, user.id, "password_reset") }
    : undefined;
}

export async function validateToken(
  db: Database,
  token: string,
  type: "email_verification" | "password_reset",
) {
  const tokenHash = hashToken(token);
  const [record] = await db
    .select()
    .from(accountTokens)
    .where(
      and(
        eq(accountTokens.tokenHash, tokenHash),
        eq(accountTokens.type, type),
        isNull(accountTokens.usedAt),
        gt(accountTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!record) throw badRequest("This link is invalid or has expired");
  return true;
}

export async function verifyEmail(db: Database, token: string) {
  const tokenHash = hashToken(token);
  const [record] = await db
    .select()
    .from(accountTokens)
    .where(
      and(
        eq(accountTokens.tokenHash, tokenHash),
        eq(accountTokens.type, "email_verification"),
        isNull(accountTokens.usedAt),
        gt(accountTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!record) throw badRequest("This link is invalid or has expired");
  await db.transaction(async (tx) => {
    await tx
      .delete(accountTokens)
      .where(
        and(eq(accountTokens.userId, record.userId), eq(accountTokens.type, "email_verification")),
      );
    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, record.userId));
  });
}

export async function resetPassword(db: Database, token: string, password: string) {
  const tokenHash = hashToken(token);
  const [record] = await db
    .select()
    .from(accountTokens)
    .where(
      and(
        eq(accountTokens.tokenHash, tokenHash),
        eq(accountTokens.type, "password_reset"),
        isNull(accountTokens.usedAt),
        gt(accountTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!record) throw badRequest("This link is invalid or has expired");
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx
      .delete(accountTokens)
      .where(
        and(eq(accountTokens.userId, record.userId), eq(accountTokens.type, "password_reset")),
      );
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, record.userId));
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
