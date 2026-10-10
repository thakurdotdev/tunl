ALTER TABLE "active_tunnel_sessions" ADD COLUMN IF NOT EXISTS "country" text;--> statement-breakpoint
ALTER TABLE "active_tunnel_sessions" ADD COLUMN IF NOT EXISTS "city" text;