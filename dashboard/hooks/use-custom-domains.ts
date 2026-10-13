import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api-client";
import type { CustomDomain, VerifyCustomDomainResult } from "@/lib/types";

export function useCustomDomainsQuery() {
  return useQuery({
    queryKey: ["custom-domains"],
    queryFn: async () => {
      const { data } = await client.get<CustomDomain[]>("/v1/custom-domains");
      return data;
    },
    refetchInterval: 10_000,
  });
}

export function useCreateCustomDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ domain, tunnelId }: { domain: string; tunnelId: string }) => {
      const { data } = await client.post<CustomDomain>("/v1/custom-domains", {
        domain,
        tunnelId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
    },
  });
}

export function useVerifyCustomDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await client.post<VerifyCustomDomainResult>(
        `/v1/custom-domains/${id}/verify`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
    },
  });
}

export function useDeleteCustomDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete<void>(`/v1/custom-domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
    },
  });
}
