import { useMutation, useQuery } from "@tanstack/react-query";
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

/** The browser's public IP as the control plane sees it (for "add my IP"). */
/** Where the browser's IP is looked up through Cloudflare, the same path tunnel traffic takes. */
const TUNNEL_EDGE_IP_URL = "https://myip.tunl.online/";

async function fetchTunnelEdgeIp(): Promise<string | null> {
  try {
    const res = await fetch(TUNNEL_EDGE_IP_URL, {
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ip?: unknown };
    return typeof body.ip === "string" && body.ip ? body.ip : null;
  } catch {
    return null;
  }
}

/**
 * The visitor's IP as tunnels see it (`tunnelIp`, via Cloudflare, often IPv6)
 * and as the dashboard API sees it (`dashboardIp`, IPv4-only host). The
 * allowlist is checked against the first one.
 */
export function useMyIpQuery() {
  return useQuery({
    queryKey: ["my-ip"],
    queryFn: async () => {
      const [tunnelIp, dashboardIp] = await Promise.all([
        fetchTunnelEdgeIp(),
        client
          .get<{ ip: string | null }>("/v1/profile/my-ip")
          .then(({ data }) => data.ip)
          .catch(() => null),
      ]);
      return { tunnelIp, dashboardIp };
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}
