"use client";

import { createContext, useContext, type ReactNode } from "react";
import { authClient } from "./auth-client";
import type { User } from "./types";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const user = (session?.user as User | undefined) || null;

  const login = async (email: string, password: string) => {
    const res = await authClient.signIn.email({
      email,
      password,
    });
    if (res.error) {
      const errorObj = new Error(res.error.message || "Failed to sign in") as Error & {
        code?: string;
      };
      errorObj.code = res.error.code;
      throw errorObj;
    }
  };

  const logout = async () => {
    await authClient.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isSessionPending,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
