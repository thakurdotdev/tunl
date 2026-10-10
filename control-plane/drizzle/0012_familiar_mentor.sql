CREATE TABLE "tunnel_bandwidth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subdomain" text NOT NULL,
	"user_id" text,
	"request_count" integer DEFAULT 0 NOT NULL,
	"bytes_in" integer DEFAULT 0 NOT NULL,
	"bytes_out" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"total_duration_ms" integer DEFAULT 0 NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_tunnel_sessions" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "active_tunnel_sessions" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "tunnels" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "tunnel_bandwidth" ADD CONSTRAINT "tunnel_bandwidth_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tunnel_bandwidth_subdomain_bucket_uidx" ON "tunnel_bandwidth" USING btree ("subdomain","bucket_start");--> statement-breakpoint
CREATE INDEX "tunnel_bandwidth_user_id_idx" ON "tunnel_bandwidth" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tunnel_bandwidth_bucket_start_idx" ON "tunnel_bandwidth" USING btree ("bucket_start");