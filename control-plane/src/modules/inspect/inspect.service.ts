import { and, eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { activeTunnelSessions, tunnels } from "../../db/schema.js";
import { forbidden } from "../../platform/errors.js";
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

export async function getRecentRequests(
  redis: RedisClient,
  subdomain: string,
  limit: number,
  offset: number,
) {
  const key = LIST_KEY_PREFIX + subdomain;
  const raw = await redis.lRange(key, offset, offset + limit - 1);
  return raw.map((entry) => JSON.parse(entry));
}

export function subscribeLiveRequests(
  redis: RedisClient,
  subdomain: string,
  onMessage: (data: string) => void,
): () => void {
  const channel = LIVE_CHANNEL_PREFIX + subdomain;
  const subscriber = redis.duplicate();

  subscriber.connect().then(() => {
    subscriber.subscribe(channel, (_message, data) => {
      onMessage(data);
    });
  });

  return () => {
    subscriber.unsubscribe(channel).catch(() => {});
    subscriber.quit().catch(() => {});
  };
}
