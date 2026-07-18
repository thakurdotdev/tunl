import { createApp } from "./app.js";
import { createDatabase } from "./db/client.js";
import { loadConfig } from "./platform/config.js";
import { closeRedis, connectRedis } from "./redis/client.js";

const config = loadConfig();
const redis = await connectRedis(config.REDIS_URL);
const server = createApp(createDatabase(config.DATABASE_URL), redis, config).listen(
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
