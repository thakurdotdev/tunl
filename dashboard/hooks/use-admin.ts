import { client } from "@/lib/api-client";
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
    mutationFn: async ({ userId, planName }: { userId: string; planName: string }) => {
      const { data } = await client.patch<{ success: boolean }>(`/v1/admin/users/${userId}/plan`, {
        planName,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      maxReservedSubdomains: number;
      maxActiveTunnels: number;
      isDefault?: boolean;
    }) => {
      const { data } = await client.post<AdminPlan>("/v1/admin/plans", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
