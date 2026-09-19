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
export const userRole = pgEnum("user_role", ["user", "admin"]);
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

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    passwordHash: text("password_hash"),
    role: userRole("role").notNull().default("user"),
    planId: uuid("plan_id").references(() => plans.id),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorSecret: text("two_factor_secret"),
    ipWhitelistEnabled: boolean("ip_whitelist_enabled").notNull().default(false),
    allowedIps: text("allowed_ips")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
  },
  (table) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${table.email})`)],
);

export const users = user;

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const accountTokens = pgTable(
  "account_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subdomain: text("subdomain").notNull().unique(),
    status: tunnelStatus("status").notNull().default("reserved"),
    password: text("password"),
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
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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

export const tunnelEventType = pgEnum("tunnel_event_type", [
  "tunnel.connected",
  "tunnel.disconnected",
]);

export const tunnelEvents = pgTable(
  "tunnel_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: text("event_id").notNull().unique(),
    eventType: tunnelEventType("event_type").notNull(),
    anonymousId: text("anonymous_id"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
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

export const identityLinks = pgTable("identity_links", {
  anonymousId: text("anonymous_id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tunnelBandwidth = pgTable(
  "tunnel_bandwidth",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subdomain: text("subdomain").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    requestCount: integer("request_count").notNull().default(0),
    bytesIn: integer("bytes_in").notNull().default(0),
    bytesOut: integer("bytes_out").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    totalDurationMs: integer("total_duration_ms").notNull().default(0),
    bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tunnel_bandwidth_subdomain_bucket_uidx").on(table.subdomain, table.bucketStart),
    index("tunnel_bandwidth_user_id_idx").on(table.userId),
    index("tunnel_bandwidth_bucket_start_idx").on(table.bucketStart),
  ],
);
