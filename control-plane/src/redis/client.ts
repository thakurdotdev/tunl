import { createClient, type RedisClientType } from "redis";

export type RedisClient = RedisClientType;

export async function connectRedis(redisUrl: string): Promise<RedisClient> {
  const client = createClient({
    url: redisUrl,
    socket: { reconnectStrategy: (retries) => Math.min(1_000 + retries * 250, 5_000) },
  });
  client.on("error", (error) => console.error({ error }, "redis client error"));
  await client.connect();
  return client;
}

export async function closeRedis(client: RedisClient) {
  if (client.isOpen) await client.quit();
}
