import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api-client";
import type { SSHKey } from "@/lib/types";

export function useSshKeysQuery() {
  return useQuery({
    queryKey: ["ssh-keys"],
    queryFn: async () => {
      const { data } = await client.get<SSHKey[]>("/v1/ssh-keys");
      return data;
    },
  });
}

export function useCreateSshKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ publicKey, label }: { publicKey: string; label: string }) => {
      const { data } = await client.post<SSHKey>("/v1/ssh-keys", { publicKey, label });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssh-keys"] });
    },
  });
}

export function useDeleteSshKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete<void>(`/v1/ssh-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ssh-keys"] });
    },
  });
}
