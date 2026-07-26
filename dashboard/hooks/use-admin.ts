import { client } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import type { AdminAnalytics, AdminPlan, AdminUser } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const { data } = await client.get<AdminAnalytics>("/v1/admin/analytics");
      return data;
    },
  });
}

export function useAdminUsers(search?: string) {
  return useQuery({
    queryKey: ["admin", "users", search],
    queryFn: async () => {
      const { data } = await client.get<AdminUser[]>(
        `/v1/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      );
      return data;
    },
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: async () => {
      const { data } = await client.get<AdminPlan[]>("/v1/admin/plans");
      return data;
    },
  });
}

export function useUpdateUserPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, planId }: { userId: string; planId: string }) => {
      const { data } = await client.patch<{ success: boolean }>(`/v1/admin/users/${userId}/plan`, {
        planId,
      });
      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      await authClient.getSession();
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "user" | "admin" }) => {
      const { data } = await client.patch<{ success: boolean }>(`/v1/admin/users/${userId}/role`, {
        role,
      });
      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      await authClient.getSession();
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      maxReservedSubdomains: number;
      maxActiveTunnels: number;
      isDefault?: boolean;
    }) => {
      const { data: res } = await client.post<AdminPlan>("/v1/admin/plans", data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
}
