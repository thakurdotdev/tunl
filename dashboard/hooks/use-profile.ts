import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

import type { User } from "@/lib/types";

export type UserProfile = User & {
  planName?: string;
};

export type Setup2FAResponse = {
  secret: string;
  qrCodeDataUrl: string;
};

export function useUpdateProfileName() {
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await authClient.updateUser({ name });
      if (res.error) {
        throw new Error(res.error.message || "Failed to update profile name");
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Profile name updated successfully!");
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to update profile name";
      toast.error(msg);
    },
  });
}

export function useSetup2FA() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await client.post<Setup2FAResponse>("/v1/profile/2fa/setup");
      return data;
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to generate 2FA setup";
      toast.error(msg);
    },
  });
}

export function useVerify2FA() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await client.post<{ success: boolean; message: string }>(
        "/v1/profile/2fa/verify",
        { code },
      );
      return data;
    },
    onSuccess: async () => {
      await authClient.getSession();
      toast.success("Two-Factor Authentication enabled successfully!");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Invalid 2FA verification code";
      toast.error(msg);
    },
  });
}

export function useDisable2FA() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await client.post<{ success: boolean; message: string }>(
        "/v1/profile/2fa/disable",
      );
      return data;
    },
    onSuccess: async () => {
      await authClient.getSession();
      toast.success("Two-Factor Authentication disabled.");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to disable 2FA";
      toast.error(msg);
    },
  });
}

export function useUpdateIpWhitelist() {
  return useMutation({
    mutationFn: async ({ allowedIps, enabled }: { allowedIps: string[]; enabled: boolean }) => {
      const { data } = await client.patch<{
        id: string;
        allowedIps: string[];
        ipWhitelistEnabled: boolean;
      }>("/v1/profile/ip-whitelist", { allowedIps, enabled });
      return data;
    },
    onSuccess: async (data) => {
      await authClient.getSession();
      if (data.ipWhitelistEnabled) {
        toast.success("IP whitelist rules saved and active!");
      } else {
        toast.info("IP whitelist rules saved (enforcement disabled).");
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to update IP whitelist";
      toast.error(msg);
    },
  });
}
