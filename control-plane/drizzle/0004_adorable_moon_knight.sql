CREATE TABLE "active_tunnel_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tunnel_id" uuid,
	"subdomain" text NOT NULL,
	"remote_ip" text DEFAULT '' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_active_tunnels" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "active_tunnel_sessions" ADD CONSTRAINT "active_tunnel_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_tunnel_sessions" ADD CONSTRAINT "active_tunnel_sessions_tunnel_id_tunnels_id_fk" FOREIGN KEY ("tunnel_id") REFERENCES "public"."tunnels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "active_tunnel_sessions_user_id_idx" ON "active_tunnel_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "active_tunnel_sessions_user_subdomain_uidx" ON "active_tunnel_sessions" USING btree ("user_id","subdomain");