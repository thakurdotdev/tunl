import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { getToken, client } from "@/lib/api-client";
import type { CapturedRequest, ReplayResult, SubdomainAnalytics } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ?? "http://localhost:3001";
const MAX_ENTRIES = 200;

export function useRecentRequests(subdomain: string) {
  return useQuery({
    queryKey: ["inspect", subdomain, "requests"],
    queryFn: async () => {
      const { data } = await client.get<CapturedRequest[]>(
        `/v1/inspect/${subdomain}/requests?limit=100`,
      );
      return data;
    },
    enabled: !!subdomain,
  });
}

export function useReplayMutation(subdomain: string) {
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await client.post<ReplayResult>(`/v1/inspect/${subdomain}/replay`, {
        requestId,
      });
      return data;
    },
  });
}

export function useSubdomainAnalytics(subdomain: string, period: "24h" | "7d" | "30d" = "24h") {
  return useQuery({
    queryKey: ["inspect", subdomain, "analytics", period],
    queryFn: async () => {
      const { data } = await client.get<SubdomainAnalytics>(
        `/v1/inspect/${subdomain}/analytics?period=${period}`,
      );
      return data;
    },
    enabled: !!subdomain,
    refetchInterval: 10_000,
  });
}

export function useInspectorSSE(subdomain: string, paused: boolean) {
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const clear = useCallback(() => setRequests([]), []);

  useEffect(() => {
    if (!subdomain || paused) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnected(false);
      }
      return;
    }

    const token = getToken();
    const url = `${BASE_URL}/v1/inspect/${subdomain}/stream`;
    const es = new EventSource(`${url}${url.includes("?") ? "&" : "?"}token=${token}`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    const RETENTION_MS = 30 * 60 * 1000;

    es.onmessage = (event) => {
      try {
        const req = JSON.parse(event.data) as CapturedRequest;
        const cutoff = Date.now() - RETENTION_MS;
        setRequests((prev) => {
          const next = [req, ...prev].filter((r) => new Date(r.timestamp).getTime() >= cutoff);
          return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next;
        });
      } catch {
        // ignore malformed events
      }
    };

    const pruneInterval = setInterval(() => {
      const cutoff = Date.now() - RETENTION_MS;
      setRequests((prev) => prev.filter((r) => new Date(r.timestamp).getTime() >= cutoff));
    }, 15_000);

    return () => {
      clearInterval(pruneInterval);
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [subdomain, paused]);

  return { requests, connected, clear, setRequests };
}
