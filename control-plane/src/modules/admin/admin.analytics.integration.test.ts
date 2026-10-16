import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../db/schema.js";
import { linkConvertedIdentity } from "../internal/identity.service.js";
import {
  getAdminGeoAnalytics,
  getAdminGrowthAnalytics,
  getAdminOverviewAnalytics,
  getAdminSessionAnalytics,
  getAdminUserAnalytics,
} from "./admin.service.js";

// Opt-in: all writes are restricted to a uniquely named, disposable schema.
const databaseUrl = process.env.ANALYTICS_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("admin analytics PostgreSQL integration", () => {
  const namespace = `analytics_test_${randomUUID().replaceAll("-", "")}`;
  const client = postgres(databaseUrl ?? "postgres://localhost/postgres", {
    max: 1,
    connection: { search_path: namespace },
  });
  const db = drizzle(client, { schema });
  const freshDb = () => drizzle(client, { schema });

  beforeAll(async () => {
    await client.unsafe(`CREATE SCHEMA "${namespace}"`);
    await client.unsafe(`
      CREATE TABLE plans (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text,
        max_reserved_subdomains integer, max_active_tunnels integer);
      CREATE TABLE "user" (id text PRIMARY KEY, email text, plan_id uuid REFERENCES plans(id),
        created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE tunnels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        last_connected_at timestamptz DEFAULT now());
      CREATE TABLE custom_domains (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE active_tunnel_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text, subdomain text, remote_ip text, country text, city text,
        connected_at timestamptz DEFAULT now());
      CREATE TABLE tunnel_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id text UNIQUE,
        event_type text, anonymous_id text, user_id text REFERENCES "user"(id),
        properties jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL);
      CREATE TABLE identity_links (anonymous_id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES "user"(id), linked_at timestamptz NOT NULL DEFAULT now());
    `);
  });

  afterAll(async () => {
    try {
      await client.unsafe(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`);
    } finally {
      await client.end();
    }
  });

  it("returns useful empty states and thirty zero-filled UTC growth buckets", async () => {
    expect(await getAdminOverviewAnalytics(db)).toMatchObject({
      totalUsers: 0,
      totalActiveSessions: 0,
      totalEvents: 0,
    });
    expect(await getAdminUserAnalytics(db)).toMatchObject({
      dauCount: 0,
      wauCount: 0,
      mauCount: 0,
      conversionRate: 0,
    });
    expect(await getAdminSessionAnalytics(db)).toMatchObject({
      avgSessionDurationMs: null,
      medianSessionDurationMs: null,
      completedSessions: 0,
      peakConcurrentTunnelsLast24h: 0,
    });
    expect(await getAdminGeoAnalytics(db)).toEqual({ uniqueIpsLast24h: 0, countries: [] });
    const growth = await getAdminGrowthAnalytics(db);
    expect(growth.days).toHaveLength(30);
    expect(
      growth.days.every((day) => day.signups === 0 && /^\d{4}-\d{2}-\d{2}$/.test(day.day)),
    ).toBe(true);
  });

  it("backfills the earliest valid conversions and constrains IP attribution", async () => {
    await client`INSERT INTO "user" (id, email, created_at) VALUES
      ('first', 'first@example.com', now() - interval '2 hours'),
      ('second', 'second@example.com', now() - interval '10 days'),
      ('direct', 'direct@example.com', now() - interval '40 days'),
      ('weekly', 'weekly@example.com', now() - interval '4 days'),
      ('monthly', 'monthly@example.com', now() - interval '20 days')`;
    await client`INSERT INTO tunnel_events (event_type, anonymous_id, user_id, properties, occurred_at) VALUES
      ('tunnel.connected', 'key', NULL, '{"remoteIp":"1.1.1.1","country":"US"}', now() - interval '3 hours'),
      ('tunnel.connected', 'key', 'first', '{"remoteIp":"1.1.1.1","country":"US"}', now() - interval '2 hours'),
      ('tunnel.connected', 'key', 'second', '{}', now() - interval '1 hour'),
      ('tunnel.connected', 'direct-key', 'direct', '{}', now() - interval '8 days'),
      ('tunnel.connected', 'weekly-key', 'weekly', '{}', now() - interval '2 days'),
      ('tunnel.connected', 'monthly-key', 'monthly', '{}', now() - interval '20 days'),
      ('tunnel.connected', '2.2.2.2', NULL, '{"remote_ip":"2.2.2.2"}', now() - interval '4 hours'),
      ('tunnel.connected', 'new-key', 'first', '{"remoteIp":"2.2.2.2"}', now() - interval '2 hours'),
      ('tunnel.connected', 'unrelated-key', NULL, '{"remoteIp":"2.2.2.2"}', now() - interval '4 hours'),
      ('tunnel.connected', 'reverse', 'direct', '{}', now() - interval '6 hours'),
      ('tunnel.connected', 'reverse', NULL, '{}', now() - interval '1 hour')`;
    const migration = await readFile(
      new URL("../../../drizzle/0013_admin_analytics.sql", import.meta.url),
      "utf8",
    );
    for (const statement of migration.split("--> statement-breakpoint"))
      await client.unsafe(statement);
    const links =
      await client`SELECT anonymous_id, user_id FROM identity_links ORDER BY anonymous_id`;
    expect([...links]).toEqual([
      { anonymous_id: "2.2.2.2", user_id: "first" },
      { anonymous_id: "key", user_id: "first" },
    ]);
    const analytics = await getAdminUserAnalytics(freshDb());
    expect(analytics).toMatchObject({
      newUsersLast24h: 1,
      newUsersLast7d: 2,
      newUsersLast30d: 4,
      dauCount: 3,
      wauCount: 4,
      mauCount: 5,
      totalConversions: 1,
      totalLinkedIdentities: 2,
      uniqueAnonymousDevices: 4,
      conversionRate: 50,
    });
    const growth = await getAdminGrowthAnalytics(freshDb());
    expect(growth.days.reduce((total, day) => total + day.signups, 0)).toBe(4);
  });

  it("automatically links prior anonymous devices idempotently without claiming shared-IP fingerprints", async () => {
    const now = new Date();
    await linkConvertedIdentity(db, "second", "reverse", "", now);
    await linkConvertedIdentity(db, "first", "reverse", "", now);
    await linkConvertedIdentity(db, "direct", "never-anonymous", "2.2.2.2", now);
    const links =
      await client`SELECT anonymous_id, user_id FROM identity_links ORDER BY anonymous_id`;
    expect([...links]).toEqual([
      { anonymous_id: "2.2.2.2", user_id: "first" },
      { anonymous_id: "key", user_id: "first" },
      { anonymous_id: "reverse", user_id: "second" },
    ]);
  });

  it("scopes traffic to connections, handles malformed durations, and includes cross-window sessions in the peak", async () => {
    await client`TRUNCATE tunnel_events`;
    await client`INSERT INTO tunnel_events (event_type, anonymous_id, user_id, properties, occurred_at) VALUES
      ('tunnel.connected', 'old', NULL, '{"remoteIp":"","country":"US"}', now() - interval '2 days'),
      ('tunnel.disconnected', 'old', NULL, '{"durationMs":172800000,"remoteIp":"3.3.3.3"}', now() - interval '1 hour'),
      ('tunnel.connected', 'one', 'first', '{"country":"US","remoteIp":"1.1.1.1"}', now() - interval '3 hours'),
      ('tunnel.connected', 'two', NULL, '{"country":"US","remote_ip":"2.2.2.2"}', now() - interval '2 hours'),
      ('tunnel.disconnected', 'one', 'first', '{"durationMs":60000,"country":"US"}', now() - interval '1 hour'),
      ('tunnel.disconnected', 'two', NULL, '{"durationMs":"invalid"}', now() - interval '30 minutes')`;
    expect(await getAdminSessionAnalytics(freshDb())).toMatchObject({
      totalAuthEvents: 1,
      totalAnonEvents: 1,
      completedSessions: 2,
      avgSessionDurationMs: 86430000,
      medianSessionDurationMs: 86430000,
      peakConcurrentTunnelsLast24h: 3,
    });
    expect(await getAdminGeoAnalytics(freshDb())).toEqual({
      uniqueIpsLast24h: 3,
      countries: [{ country: "US", sessionCount: 2, uniqueDevices: 2 }],
    });
  });
});
