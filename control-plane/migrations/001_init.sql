-- gen_random_uuid() is built into Postgres 13+ core; on older versions
-- run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first.

CREATE TABLE plans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL UNIQUE,
  max_reserved_subdomains INT NOT NULL DEFAULT 1,
  is_default              BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforces exactly one default plan at a time (partial unique index),
-- so signup can always find "the" default via is_default = true.
CREATE UNIQUE INDEX plans_single_default_idx ON plans (is_default) WHERE is_default = true;

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT,                            -- nullable: OAuth-only accounts are deferred, but the column shape is future-proof
  plan_id       UUID NOT NULL REFERENCES plans(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness on email without an extra extension dependency.
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE ssh_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key  TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,               -- SHA256 fingerprint; UNIQUE already creates an index, no separate CREATE INDEX needed for lookups by fingerprint
  label       TEXT NOT NULL DEFAULT '',           -- user-facing name e.g. "laptop"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign keys are NOT auto-indexed in Postgres (unlike unique constraints) —
-- needed for "list my keys" and for the cascade delete to be efficient.
CREATE INDEX ssh_keys_user_id_idx ON ssh_keys (user_id);

CREATE TABLE tunnels (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subdomain          TEXT NOT NULL UNIQUE CHECK (subdomain ~ '^[a-z0-9-]{3,63}$'),
  status             TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'active', 'inactive')),
  last_connected_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tunnels_user_id_idx ON tunnels (user_id);

-- Seed the single default plan referenced by AuthModule signup logic
-- (plan section 2.4, task 1).
INSERT INTO plans (name, max_reserved_subdomains, is_default)
VALUES ('free', 1, true);
