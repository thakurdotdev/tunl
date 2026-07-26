import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || undefined,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
