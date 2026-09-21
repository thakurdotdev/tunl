import { client } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import type {
  AdminAnalytics,
  AdminAuditQuery,
  AdminBandwidthAnalytics,
  AdminPlan,
  AdminUsersQuery,
  AdminUsersResponse,
  PaginatedResponse,
  TunnelEventItem,
} from "@/lib/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const { data } = await client.get<AdminAnalytics>("/v1/admin/analytics");
      return data;
    },
  });
}

export function useAdminBandwidthAnalytics(period: "24h" | "7d" | "30d" = "24h") {
  return useQuery({
    queryKey: ["admin", "bandwidth", period],
    queryFn: async () => {
      const { data } = await client.get<AdminBandwidthAnalytics>(
        `/v1/admin/analytics/bandwidth?period=${period}`,
      );
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
}

export function useAdminAudit(
  query: AdminAuditQuery = {},
  options?: { refetchInterval?: number | false },
) {
  const { page = 1, pageSize = 20, search, eventType } = query;
  return useQuery({
    queryKey: ["admin", "audit", { page, pageSize, search, eventType }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(page));
      searchParams.set("pageSize", String(pageSize));
      if (search && search.trim()) searchParams.set("search", search.trim());
      if (eventType && eventType !== "all") searchParams.set("eventType", eventType);

      const { data } = await client.get<PaginatedResponse<TunnelEventItem>>(
        `/v1/admin/audit?${searchParams.toString()}`,
      );
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: options?.refetchInterval ?? false,
  });
}

export function useAdminUsers(query: AdminUsersQuery = {}) {
  const {
    page = 1,
    pageSize = 15,
    search,
    role,
    planId,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  return useQuery({
    queryKey: ["admin", "users", { page, pageSize, search, role, planId, sortBy, sortOrder }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(page));
      searchParams.set("pageSize", String(pageSize));
      if (search && search.trim()) searchParams.set("search", search.trim());
      if (role && role !== "all") searchParams.set("role", role);
      if (planId && planId !== "all") searchParams.set("planId", planId);
      if (sortBy) searchParams.set("sortBy", sortBy);
      if (sortOrder) searchParams.set("sortOrder", sortOrder);

      const { data } = await client.get<AdminUsersResponse>(
        `/v1/admin/users?${searchParams.toString()}`,
      );
      return data;
    },
    placeholderData: keepPreviousData,
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
