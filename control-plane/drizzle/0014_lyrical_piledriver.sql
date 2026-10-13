DO $$ BEGIN CREATE TYPE "public"."custom_domain_status" AS ENUM('pending', 'verified', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_custom_domains" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tunnel_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"domain_lower" text NOT NULL,
	"verification_token" text NOT NULL,
	"status" "custom_domain_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domains_domain_lower_unique" UNIQUE("domain_lower")
);--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_tunnel_id_tunnels_id_fk" FOREIGN KEY ("tunnel_id") REFERENCES "public"."tunnels"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_domains_user_id_idx" ON "custom_domains" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_domains_tunnel_id_idx" ON "custom_domains" USING btree ("tunnel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_domains_status_idx" ON "custom_domains" USING btree ("status");