import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api-client";
import type { Tunnel } from "@/lib/types";

export function useTunnelsQuery() {
  return useQuery({
    queryKey: ["tunnels"],
    queryFn: async () => {
      const { data } = await client.get<Tunnel[]>("/v1/tunnels");
      return data;
    },
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
