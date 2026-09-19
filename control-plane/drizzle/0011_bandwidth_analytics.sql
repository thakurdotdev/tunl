CREATE TABLE IF NOT EXISTS "tunnel_bandwidth" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subdomain" text NOT NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "request_count" integer DEFAULT 0 NOT NULL,
  "bytes_in" integer DEFAULT 0 NOT NULL,
  "bytes_out" integer DEFAULT 0 NOT NULL,
  "error_count" integer DEFAULT 0 NOT NULL,
  "total_duration_ms" integer DEFAULT 0 NOT NULL,
  "bucket_start" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tunnel_bandwidth_subdomain_bucket_uidx" ON "tunnel_bandwidth" ("subdomain", "bucket_start");
CREATE INDEX IF NOT EXISTS "tunnel_bandwidth_user_id_idx" ON "tunnel_bandwidth" ("user_id");
CREATE INDEX IF NOT EXISTS "tunnel_bandwidth_bucket_start_idx" ON "tunnel_bandwidth" ("bucket_start");
