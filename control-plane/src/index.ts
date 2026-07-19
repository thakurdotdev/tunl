import { createApp } from "./app.js";
import { createDatabase } from "./db/client.js";
import { runMigrationsAndSeed } from "./db/migrate.js";
import { loadConfig } from "./platform/config.js";
import { closeRedis, connectRedis } from "./redis/client.js";

const config = loadConfig();
const db = createDatabase(config.DATABASE_URL);
await runMigrationsAndSeed(db);

const redis = await connectRedis(config.REDIS_URL);
const server = createApp(db, redis, config).listen(
  config.PORT,
  () => console.log(`control-plane listening on :${config.PORT}`),
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () =>
    server.close(() => {
      void closeRedis(redis).finally(() => process.exit(0));
    }),
  );
}
