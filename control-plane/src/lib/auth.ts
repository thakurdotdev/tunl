import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { ResendAuthMailer } from "../modules/auth/mailer.js";

const mailer = new ResendAuthMailer({
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  DASHBOARD_URL: process.env.DASHBOARD_URL,
} as any);

const getBetterAuthBaseUrl = () => {
  const url = process.env.BETTER_AUTH_URL!;
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed.endsWith("/api/auth")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/auth`;
  return `${trimmed}/api/auth`;
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      updateUserInfoOnLink: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, token }) {
      await mailer.sendPasswordReset(user.email, token);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, token }) {
      await mailer.sendVerification(user.email, token);
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      overrideUserInfoOnSignIn: true,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      overrideUserInfoOnSignIn: true,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
      planId: {
        type: "string",
        required: false,
      },
      twoFactorEnabled: {
        type: "boolean",
        defaultValue: false,
      },
      twoFactorSecret: {
        type: "string",
        required: false,
      },
      ipWhitelistEnabled: {
        type: "boolean",
        defaultValue: false,
      },
      allowedIps: {
        type: "string[]",
        required: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!user.planId) {
            const [defaultPlan] = await db
              .select()
              .from(schema.plans)
              .where(eq(schema.plans.isDefault, true))
              .limit(1);
            if (defaultPlan) {
              return {
                data: {
                  ...user,
                  planId: defaultPlan.id,
                },
              };
            }
          }
        },
      },
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      let userPlan = { name: "free", maxReservedSubdomains: 1 };
      const rawUser = user as Record<string, any>;
      if (rawUser.planId) {
        const [p] = await db
          .select()
          .from(schema.plans)
          .where(eq(schema.plans.id, rawUser.planId))
          .limit(1);
        if (p) {
          userPlan = {
            name: p.name,
            maxReservedSubdomains: p.maxReservedSubdomains,
          };
        }
      }
      return {
        user: {
          ...user,
          plan: userPlan,
        },
        session,
      };
    }),
  ],
  trustedOrigins: [process.env.DASHBOARD_URL!],
  baseURL: getBetterAuthBaseUrl(),
  secret: process.env.BETTER_AUTH_SECRET!,
});
