CREATE TYPE "public"."tunnel_event_type" AS ENUM('tunnel.connected', 'tunnel.disconnected');--> statement-breakpoint
CREATE TABLE "identity_links" (
	"anonymous_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tunnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" "tunnel_event_type" NOT NULL,
	"anonymous_id" text,
	"user_id" uuid,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tunnel_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "identity_links" ADD CONSTRAINT "identity_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tunnel_events" ADD CONSTRAINT "tunnel_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tunnel_events_occurred_at_idx" ON "tunnel_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "tunnel_events_anonymous_id_idx" ON "tunnel_events" USING btree ("anonymous_id");--> statement-breakpoint
CREATE INDEX "tunnel_events_user_id_idx" ON "tunnel_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tunnel_events_event_type_idx" ON "tunnel_events" USING btree ("event_type");