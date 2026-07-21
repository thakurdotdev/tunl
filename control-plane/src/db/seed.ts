import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { plans } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const client = postgres(databaseUrl);
const db = drizzle(client);

await db
  .insert(plans)
  .values({ name: "free", maxReservedSubdomains: 1, maxActiveTunnels: 1, isDefault: true })
  .onConflictDoNothing({ target: plans.name });
await client.end();
