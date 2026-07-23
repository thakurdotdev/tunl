import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { getToken, client } from "@/lib/api-client";
import type { CapturedRequest } from "@/lib/types";

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

    es.onmessage = (event) => {
      try {
        const req = JSON.parse(event.data) as CapturedRequest;
        setRequests((prev) => {
          const next = [req, ...prev];
          return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next;
        });
      } catch {
        // ignore malformed events
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [subdomain, paused]);

  return { requests, connected, clear, setRequests };
}
