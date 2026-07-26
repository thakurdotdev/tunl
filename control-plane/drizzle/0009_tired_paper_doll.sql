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

-- Copy existing users to user table if old users table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at, password_hash, role, plan_id, two_factor_enabled, two_factor_secret, ip_whitelist_enabled, allowed_ips)
    SELECT id::text, name, email, email_verified, NULL as image, created_at, updated_at, password_hash, role, plan_id, two_factor_enabled, two_factor_secret, ip_whitelist_enabled, allowed_ips
    FROM "users"
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

DROP TABLE IF EXISTS "users" CASCADE;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_tokens') THEN
    ALTER TABLE "account_tokens" DROP CONSTRAINT IF EXISTS "account_tokens_user_id_users_id_fk";
    ALTER TABLE "account_tokens" ALTER COLUMN "user_id" SET DATA TYPE text USING user_id::text;
    DELETE FROM "account_tokens" WHERE "user_id" NOT IN (SELECT id FROM "user");
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'account_tokens_user_id_user_id_fk') THEN
      ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'identity_links') THEN
    ALTER TABLE "identity_links" DROP CONSTRAINT IF EXISTS "identity_links_user_id_users_id_fk";
    ALTER TABLE "identity_links" ALTER COLUMN "user_id" SET DATA TYPE text USING user_id::text;
    DELETE FROM "identity_links" WHERE "user_id" NOT IN (SELECT id FROM "user");
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'identity_links_user_id_user_id_fk') THEN
      ALTER TABLE "identity_links" ADD CONSTRAINT "identity_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_tunnel_sessions') THEN
    ALTER TABLE "active_tunnel_sessions" DROP CONSTRAINT IF EXISTS "active_tunnel_sessions_user_id_users_id_fk";
    ALTER TABLE "active_tunnel_sessions" ALTER COLUMN "user_id" SET DATA TYPE text USING user_id::text;
    DELETE FROM "active_tunnel_sessions" WHERE "user_id" NOT IN (SELECT id FROM "user");
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'active_tunnel_sessions_user_id_user_id_fk') THEN
      ALTER TABLE "active_tunnel_sessions" ADD CONSTRAINT "active_tunnel_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ssh_keys') THEN
    ALTER TABLE "ssh_keys" DROP CONSTRAINT IF EXISTS "ssh_keys_user_id_users_id_fk";
    ALTER TABLE "ssh_keys" ALTER COLUMN "user_id" SET DATA TYPE text USING user_id::text;
    DELETE FROM "ssh_keys" WHERE "user_id" NOT IN (SELECT id FROM "user");
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ssh_keys_user_id_user_id_fk') THEN
      ALTER TABLE "ssh_keys" ADD CONSTRAINT "ssh_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tunnel_events') THEN
    ALTER TABLE "tunnel_events" DROP CONSTRAINT IF EXISTS "tunnel_events_user_id_users_id_fk";
    ALTER TABLE "tunnel_events" ALTER COLUMN "user_id" SET DATA TYPE text USING user_id::text;
    UPDATE "tunnel_events" SET "user_id" = NULL WHERE "user_id" IS NOT NULL AND "user_id" NOT IN (SELECT id FROM "user");
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tunnel_events_user_id_user_id_fk') THEN
      ALTER TABLE "tunnel_events" ADD CONSTRAINT "tunnel_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tunnels') THEN
    ALTER TABLE "tunnels" DROP CONSTRAINT IF EXISTS "tunnels_user_id_users_id_fk";
    ALTER TABLE "tunnels" ALTER COLUMN "user_id" SET DATA TYPE text USING user_id::text;
    DELETE FROM "tunnels" WHERE "user_id" NOT IN (SELECT id FROM "user");
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tunnels_user_id_user_id_fk') THEN
      ALTER TABLE "tunnels" ADD CONSTRAINT "tunnels_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END IF;
END $$;

DO $$ BEGIN
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