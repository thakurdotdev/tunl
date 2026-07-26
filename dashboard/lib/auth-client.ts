import { createAuthClient } from "better-auth/react";

const getAuthBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL;
  if (!url) return undefined;
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed.endsWith("/api/auth")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/auth`;
  return `${trimmed}/api/auth`;
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
