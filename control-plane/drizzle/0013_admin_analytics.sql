CREATE INDEX "tunnel_events_occurred_user_idx" ON "tunnel_events" USING btree ("occurred_at" DESC NULLS LAST,"user_id") WHERE "tunnel_events"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tunnel_events_country_idx" ON "tunnel_events" USING btree (("properties"->>'country')) WHERE "tunnel_events"."properties"->>'country' IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tunnel_events_remote_ip_idx" ON "tunnel_events" USING btree (COALESCE("properties"->>'remoteIp', "properties"->>'remote_ip'));--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "user" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
-- Attribute to the earliest authenticated connection after anonymous usage.
-- Fingerprints are linked before the lower-confidence IP fallback.
INSERT INTO identity_links (anonymous_id, user_id, linked_at)
SELECT DISTINCT ON (auth.anonymous_id) auth.anonymous_id, auth.user_id, auth.occurred_at
FROM tunnel_events auth
WHERE auth.user_id IS NOT NULL AND auth.anonymous_id IS NOT NULL AND auth.anonymous_id <> ''
  AND auth.event_type = 'tunnel.connected'
  AND EXISTS (
    SELECT 1 FROM tunnel_events anon
    WHERE anon.anonymous_id = auth.anonymous_id AND anon.user_id IS NULL
      AND anon.event_type = 'tunnel.connected' AND anon.occurred_at < auth.occurred_at
  )
ORDER BY auth.anonymous_id, auth.occurred_at, auth.user_id
ON CONFLICT (anonymous_id) DO NOTHING;--> statement-breakpoint
INSERT INTO identity_links (anonymous_id, user_id, linked_at)
SELECT DISTINCT ON (anon.anonymous_id) anon.anonymous_id, auth.user_id, auth.occurred_at
FROM tunnel_events anon
JOIN tunnel_events auth
  ON COALESCE(anon.properties->>'remoteIp', anon.properties->>'remote_ip')
    = COALESCE(auth.properties->>'remoteIp', auth.properties->>'remote_ip')
  AND auth.user_id IS NOT NULL AND auth.event_type = 'tunnel.connected'
  AND anon.occurred_at < auth.occurred_at
WHERE anon.user_id IS NULL AND anon.event_type = 'tunnel.connected'
  AND anon.anonymous_id IS NOT NULL AND anon.anonymous_id <> ''
  AND anon.anonymous_id = COALESCE(anon.properties->>'remoteIp', anon.properties->>'remote_ip')
ORDER BY anon.anonymous_id, auth.occurred_at, auth.user_id
ON CONFLICT (anonymous_id) DO NOTHING;
