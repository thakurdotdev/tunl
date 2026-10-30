import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";

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
  plugins: [passkeyClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
