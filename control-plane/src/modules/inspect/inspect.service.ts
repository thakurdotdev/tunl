import { and, eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { activeTunnelSessions, tunnels } from "../../db/schema.js";
import type { Config } from "../../platform/config.js";
import { forbidden, notFound } from "../../platform/errors.js";
import type { RedisClient } from "../../redis/client.js";

const LIST_KEY_PREFIX = "tunl:requests:";
const LIVE_CHANNEL_PREFIX = "tunl:requests:live:";

export async function verifySubdomainOwnership(db: Database, userId: string, subdomain: string) {
  const [owned] = await db
    .select({ id: tunnels.id })
    .from(tunnels)
    .where(and(eq(tunnels.userId, userId), eq(tunnels.subdomain, subdomain)))
    .limit(1);

  if (owned) return;

  const [activeSession] = await db
    .select({ id: activeTunnelSessions.id })
    .from(activeTunnelSessions)
    .where(
      and(eq(activeTunnelSessions.userId, userId), eq(activeTunnelSessions.subdomain, subdomain)),
    )
    .limit(1);

  if (!activeSession) {
    throw forbidden("You do not own this subdomain");
  }
}

const RETENTION_MS = 30 * 60 * 1000;

export async function getRecentRequests(
  redis: RedisClient,
  subdomain: string,
  limit: number,
  offset: number,
) {
  const key = LIST_KEY_PREFIX + subdomain;
  const raw = await redis.lRange(key, 0, -1);
  const cutoff = Date.now() - RETENTION_MS;

  const validEntries: any[] = [];
  let firstExpiredIdx = -1;

  for (let i = 0; i < raw.length; i++) {
    try {
      const parsed = JSON.parse(raw[i]);
      const reqTime = new Date(parsed.timestamp).getTime();
      if (reqTime >= cutoff) {
        validEntries.push(parsed);
      } else {
        firstExpiredIdx = i;
        break;
      }
    } catch {
      // ignore
    }
  }

  if (firstExpiredIdx === 0) {
    await redis.del(key).catch(() => {});
  } else if (firstExpiredIdx > 0) {
    await redis.lTrim(key, 0, firstExpiredIdx - 1).catch(() => {});
  }

  return validEntries.slice(offset, offset + limit);
}

export async function getRequestById(redis: RedisClient, subdomain: string, requestId: string) {
  const raw = await redis.lRange(LIST_KEY_PREFIX + subdomain, 0, 199);
  for (const entry of raw) {
    try {
      const parsed = JSON.parse(entry);
      if (parsed.id === requestId) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  throw notFound("Captured request not found");
}

export type ReplayResult = {
  success: boolean;
  statusCode: number;
  durationMs: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
};

export async function replayRequest(
  config: Config,
  subdomain: string,
  captured: any,
): Promise<ReplayResult> {
  const targetBase =
    config.TUNNEL_SERVER_HTTP_URL ||
    `${config.TUNNEL_URL_SCHEME}://${subdomain}.${config.BASE_DOMAIN}`;
  const targetUrl = new URL(captured.path, targetBase).toString();

  const headers = new Headers();
  if (captured.requestHeaders) {
    for (const [key, value] of Object.entries(captured.requestHeaders)) {
      const lower = key.toLowerCase();
      if (
        lower === "host" ||
        lower === "content-length" ||
        lower === "connection" ||
        lower === "transfer-encoding"
      ) {
        continue;
      }
      headers.set(key, value as string);
    }
  }

  headers.set("Host", `${subdomain}.${config.BASE_DOMAIN}`);
  headers.set("X-Tunl-Internal-Secret", config.INTERNAL_SHARED_SECRET);
  headers.set("X-Tunl-Replay", "true");

  const start = Date.now();
  try {
    const hasBody = captured.requestBody && captured.method !== "GET" && captured.method !== "HEAD";

    const res = await fetch(targetUrl, {
      method: captured.method,
      headers,
      body: hasBody ? captured.requestBody : undefined,
      signal: AbortSignal.timeout(15_000),
    });

    const durationMs = Date.now() - start;
    const responseBody = await res.text();
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    return {
      success: res.ok,
      statusCode: res.status,
      durationMs,
      responseHeaders,
      responseBody,
    };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    return {
      success: false,
      statusCode: 504,
      durationMs,
      responseHeaders: {},
      responseBody: err.message || "Failed to reach tunnel target",
    };
  }
}

export function subscribeLiveRequests(
  redis: RedisClient,
  subdomain: string,
  onMessage: (data: string) => void,
): () => void {
  const channel = LIVE_CHANNEL_PREFIX + subdomain;
  const subscriber = redis.duplicate();

  subscriber
    .connect()
    .then(() => {
      subscriber.subscribe(channel, (message) => {
        onMessage(message);
      });
    })
    .catch((err: unknown) => {
      console.error(`[inspect-sse] redis subscribe error for channel=${channel}:`, err);
    });

  return () => {
    subscriber.unsubscribe(channel).catch(() => {});
    subscriber.quit().catch(() => {});
  };
}
