CREATE TABLE IF NOT EXISTS "passkey" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "public_key" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "credential_id" text NOT NULL UNIQUE,
  "counter" integer NOT NULL,
  "device_type" text NOT NULL,
  "backed_up" boolean NOT NULL,
  "transports" text,
  "created_at" timestamp with time zone,
  "aaguid" text
);
