import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Database } from "./client.js";
import { plans } from "./schema.js";

export async function runMigrationsAndSeed(db: Database) {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db
    .insert(plans)
    .values({ name: "free", maxReservedSubdomains: 1, isDefault: true })
    .onConflictDoNothing({ target: plans.name });
}
