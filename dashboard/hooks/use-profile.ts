import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api-client";

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  twoFactorEnabled: boolean;
  ipWhitelistEnabled: boolean;
  allowedIps: string[];
  planName: string;
  createdAt: string;
};

export type Setup2FAResponse = {
  secret: string;
  qrCodeDataUrl: string;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await client.get<UserProfile>("/v1/profile");
      return data;
    },
  });
}

export function useUpdateProfileName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await client.patch<{ id: string; name: string | null }>("/v1/profile", {
        name,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useSetup2FA() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await client.post<Setup2FAResponse>("/v1/profile/2fa/setup");
      return data;
    },
  });
}

export function useVerify2FA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await client.post<{ success: boolean; message: string }>(
        "/v1/profile/2fa/verify",
        { code },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useDisable2FA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await client.post<{ success: boolean; message: string }>(
        "/v1/profile/2fa/disable",
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdateIpWhitelist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ allowedIps, enabled }: { allowedIps: string[]; enabled: boolean }) => {
      const { data } = await client.patch<{
        id: string;
        allowedIps: string[];
        ipWhitelistEnabled: boolean;
      }>("/v1/profile/ip-whitelist", { allowedIps, enabled });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
