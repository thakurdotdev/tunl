import { desc, eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { activeTunnelSessions } from "../../db/schema.js";

export const tunnelSessionOutputSelect = {
  id: activeTunnelSessions.id,
  tunnelId: activeTunnelSessions.tunnelId,
  subdomain: activeTunnelSessions.subdomain,
  remoteIp: activeTunnelSessions.remoteIp,
  connectedAt: activeTunnelSessions.connectedAt,
  lastSeenAt: activeTunnelSessions.lastSeenAt,
};

export async function listActiveTunnelSessions(db: Database, userId: string) {
  return db
    .select(tunnelSessionOutputSelect)
    .from(activeTunnelSessions)
    .where(eq(activeTunnelSessions.userId, userId))
    .orderBy(desc(activeTunnelSessions.connectedAt));
}
