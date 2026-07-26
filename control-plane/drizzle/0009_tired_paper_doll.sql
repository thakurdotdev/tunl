CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"password_hash" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"plan_id" uuid,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"ip_whitelist_enabled" boolean DEFAULT false NOT NULL,
	"allowed_ips" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Drop old users table and all foreign key constraints referencing it
DROP TABLE IF EXISTS "users" CASCADE;

-- Clear old table data that referenced old UUID users
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_tokens') THEN
    TRUNCATE TABLE "account_tokens";
    ALTER TABLE "account_tokens" ALTER COLUMN "user_id" SET DATA TYPE text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'identity_links') THEN
    TRUNCATE TABLE "identity_links";
    ALTER TABLE "identity_links" ALTER COLUMN "user_id" SET DATA TYPE text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_tunnel_sessions') THEN
    TRUNCATE TABLE "active_tunnel_sessions";
    ALTER TABLE "active_tunnel_sessions" ALTER COLUMN "user_id" SET DATA TYPE text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ssh_keys') THEN
    TRUNCATE TABLE "ssh_keys";
    ALTER TABLE "ssh_keys" ALTER COLUMN "user_id" SET DATA TYPE text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tunnel_events') THEN
    ALTER TABLE "tunnel_events" ALTER COLUMN "user_id" SET DATA TYPE text;
    UPDATE "tunnel_events" SET "user_id" = NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tunnels') THEN
    TRUNCATE TABLE "tunnels" CASCADE;
    ALTER TABLE "tunnels" ALTER COLUMN "user_id" SET DATA TYPE text;
  END IF;
END $$;

-- Add new foreign key constraints referencing "user"("id")
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'account_tokens_user_id_user_id_fk') THEN
    ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'identity_links_user_id_user_id_fk') THEN
    ALTER TABLE "identity_links" ADD CONSTRAINT "identity_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'active_tunnel_sessions_user_id_user_id_fk') THEN
    ALTER TABLE "active_tunnel_sessions" ADD CONSTRAINT "active_tunnel_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ssh_keys_user_id_user_id_fk') THEN
    ALTER TABLE "ssh_keys" ADD CONSTRAINT "ssh_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tunnel_events_user_id_user_id_fk') THEN
    ALTER TABLE "tunnel_events" ADD CONSTRAINT "tunnel_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tunnels_user_id_user_id_fk') THEN
    ALTER TABLE "tunnels" ADD CONSTRAINT "tunnels_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'account_user_id_user_id_fk') THEN
    ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'session_user_id_user_id_fk') THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_plan_id_plans_id_fk') THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_idx" ON "user" USING btree (lower("email"));