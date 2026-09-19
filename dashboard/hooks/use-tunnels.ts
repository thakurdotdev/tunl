import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api-client";
import type { Tunnel, TunnelSession } from "@/lib/types";

export function useTunnelsQuery() {
  return useQuery({
    queryKey: ["tunnels"],
    queryFn: async () => {
      const { data } = await client.get<Tunnel[]>("/v1/tunnels");
      return data;
    },
    refetchInterval: 3_000,
  });
}

export function useTunnelSessionsQuery() {
  return useQuery({
    queryKey: ["tunnel-sessions"],
    queryFn: async () => {
      const { data } = await client.get<TunnelSession[]>("/v1/tunnel-sessions");
      return data;
    },
    refetchInterval: 3_000,
  });
}

export function useCreateTunnelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subdomain: string) => {
      const { data } = await client.post<Tunnel>("/v1/tunnels", { subdomain });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tunnels"] });
    },
  });
}

export function useDeleteTunnelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete<void>(`/v1/tunnels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tunnels"] });
    },
  });
}

export function useUpdateTunnelPasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string | null }) => {
      const { data } = await client.patch<{ id: string; hasPassword: boolean }>(
        `/v1/tunnels/${id}/password`,
        { password },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tunnels"] });
    },
  });
}
