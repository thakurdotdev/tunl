import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { accountTokens, plans, users } from "../../db/schema.js";
import { badRequest, notFound, unauthorized, forbidden } from "../../platform/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";

export type PublicUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  plan: { name: string; maxReservedSubdomains: number };
};
type AuthRow = {
  id: string;
  email: string;
  passwordHash: string | null;
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
  plan: { name: row.planName, maxReservedSubdomains: row.maxReservedSubdomains },
});

async function getUserByEmail(db: Database, email: string): Promise<AuthRow | undefined> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
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
  if (existing)
    return existing.emailVerifiedAt
      ? {}
      : { verificationToken: await issueToken(db, existing.id, "email_verification") };
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
    if (isUniqueViolation(error)) return {};
    throw error;
  }
}

export async function login(db: Database, email: string, password: string): Promise<PublicUser> {
  const row = await getUserByEmail(db, email);
  if (!row?.passwordHash || !(await verifyPassword(row.passwordHash, password)))
    throw unauthorized();
  if (!row.emailVerifiedAt) throw forbidden("email verification is required before login");
  return publicUser(row);
}

export async function getProfile(db: Database, userId: string): Promise<PublicUser> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
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
