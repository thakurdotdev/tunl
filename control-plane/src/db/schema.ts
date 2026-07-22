import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const tunnelStatus = pgEnum("tunnel_status", ["reserved", "active", "inactive"]);
export const accountTokenType = pgEnum("account_token_type", [
  "email_verification",
  "password_reset",
]);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    maxReservedSubdomains: integer("max_reserved_subdomains").notNull().default(1),
    maxActiveTunnels: integer("max_active_tunnels").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("plans_single_default_idx")
      .on(table.isDefault)
      .where(sql`${table.isDefault} = true`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${table.email})`)],
);

export const accountTokens = pgTable(
  "account_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: accountTokenType("type").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("account_tokens_one_active_type_idx").on(table.userId, table.type)],
);

export const sshKeys = pgTable(
  "ssh_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicKey: text("public_key").notNull(),
    fingerprint: text("fingerprint").notNull().unique(),
    label: text("label").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ssh_keys_user_id_idx").on(table.userId)],
);

export const tunnels = pgTable(
  "tunnels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subdomain: text("subdomain").notNull().unique(),
    status: tunnelStatus("status").notNull().default("reserved"),
    lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tunnels_user_id_idx").on(table.userId),
    check("tunnels_subdomain_format_check", sql`${table.subdomain} ~ '^[a-z0-9-]{3,63}$'`),
  ],
);

export const activeTunnelSessions = pgTable(
  "active_tunnel_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tunnelId: uuid("tunnel_id").references(() => tunnels.id, { onDelete: "set null" }),
    subdomain: text("subdomain").notNull(),
    remoteIp: text("remote_ip").notNull().default(""),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("active_tunnel_sessions_user_id_idx").on(table.userId),
    uniqueIndex("active_tunnel_sessions_user_subdomain_uidx").on(table.userId, table.subdomain),
  ],
);

// Append-only analytics event log — never mutated after insert.
// Covers both anonymous and authenticated sessions.
// Properties JSONB keeps the schema stable as we track new fields over time.
// Table is partition-ready (RANGE on occurred_at) if row volume warrants it.
export const tunnelEventType = pgEnum("tunnel_event_type", [
  "tunnel.connected",
  "tunnel.disconnected",
]);

export const tunnelEvents = pgTable(
  "tunnel_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Idempotency key: <sessionID>:<event_type> — safe to retry/replay.
    eventId: text("event_id").notNull().unique(),
    eventType: tunnelEventType("event_type").notNull(),
    // Set for ALL sessions (anon + auth). Enables retroactive attribution
    // when an anonymous user later signs up (see identity_links).
    anonymousId: text("anonymous_id"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    // Flexible bag for event-specific data (subdomain, remote_ip, plan,
    // duration_ms, disconnect_reason, session_type, etc.).
    properties: jsonb("properties").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tunnel_events_occurred_at_idx").on(table.occurredAt),
    index("tunnel_events_anonymous_id_idx").on(table.anonymousId),
    index("tunnel_events_user_id_idx").on(table.userId),
    index("tunnel_events_event_type_idx").on(table.eventType),
  ],
);

// Links an anonymous device fingerprint to the user who signed up with it.
// Written at signup time so all past anonymous sessions can be attributed.
export const identityLinks = pgTable("identity_links", {
  anonymousId: text("anonymous_id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
});
