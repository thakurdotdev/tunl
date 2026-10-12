import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";

export async function linkConvertedIdentity(
  db: Database,
  userId: string,
  anonymousId: string,
  remoteIp: string,
  occurredAt: Date,
) {
  const timestamp = occurredAt.toISOString();
  // Fingerprint attribution takes precedence. IP attribution is limited to
  // anonymous clients that used their IP as their device identifier.
  await db.execute(sql`
    INSERT INTO identity_links (anonymous_id, user_id, linked_at)
    SELECT DISTINCT anonymous_id, ${userId}, ${timestamp}::timestamptz
    FROM tunnel_events
    WHERE user_id IS NULL AND event_type = 'tunnel.connected'
      AND anonymous_id IS NOT NULL AND anonymous_id <> ''
      AND occurred_at < ${timestamp}::timestamptz
      AND (
        (${anonymousId} <> '' AND anonymous_id = ${anonymousId})
        OR (${remoteIp} <> '' AND anonymous_id = ${remoteIp}
          AND COALESCE(properties->>'remoteIp', properties->>'remote_ip') = ${remoteIp})
      )
    ON CONFLICT (anonymous_id) DO NOTHING
  `);
}
