DROP INDEX "custom_domains_tunnel_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domains_tunnel_id_uidx" ON "custom_domains" USING btree ("tunnel_id");--> statement-breakpoint
CREATE INDEX "tunnels_last_connected_at_idx" ON "tunnels" USING btree ("last_connected_at");