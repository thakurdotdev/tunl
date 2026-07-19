import { useQuery, useMutation } from "@tanstack/react-query";
import { client } from "@/lib/api-client";
import type { User } from "@/lib/types";

export function useProfileQuery(enabled = true) {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await client.get<User>("/v1/me");
      return data;
    },
    enabled,
  });
}

export function useVerifyTokenQuery(
  token: string | null,
  type: "email_verification" | "password_reset",
) {
  return useQuery({
    queryKey: ["verify-token", token, type],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const { data } = await client.post<{ valid: boolean }>("/v1/auth/verify-token", {
        token,
        type,
      });
      return data;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useSignupMutation() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await client.post<{ message: string }>("/v1/auth/signup", {
        email,
        password,
      });
      return data;
    },
  });
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: async (token: string) => {
      await client.post<void>("/v1/auth/verify-email", { token });
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await client.post<{ message: string }>("/v1/auth/resend-verification", {
        email,
      });
      return data;
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await client.post<{ message: string }>("/v1/auth/forgot-password", {
        email,
      });
      return data;
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      await client.post<void>("/v1/auth/reset-password", { token, password });
    },
  });
}
