import type { Database } from "../../db/client.js";

// Database-scoped caches prevent results leaking between database instances.
const caches = new WeakMap<
  Database,
  Map<string, { promise: Promise<unknown>; expiresAt: number }>
>();

export function cachedAnalytics<T>(
  db: Database,
  key: string,
  ttlMs: number,
  query: () => Promise<T>,
): Promise<T> {
  let cache = caches.get(db);
  if (!cache) {
    cache = new Map();
    caches.set(db, cache);
  }
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.promise as Promise<T>;

  // Share in-flight work as well as completed results. Failures are never cached.
  const entry = { promise: Promise.resolve().then(query), expiresAt: Infinity };
  cache.set(key, entry);
  entry.promise.then(
    () => {
      entry.expiresAt = Date.now() + ttlMs;
    },
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  return entry.promise;
}
