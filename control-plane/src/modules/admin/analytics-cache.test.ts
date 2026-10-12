import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../../db/client.js";
import { cachedAnalytics } from "./analytics-cache.js";

afterEach(() => vi.useRealTimers());

describe("analytics cache", () => {
  it("coalesces concurrent requests, expires results, and isolates databases", async () => {
    vi.useFakeTimers();
    const db = {} as Database;
    const otherDb = {} as Database;
    const query = vi.fn(async () => 42);
    const first = cachedAnalytics(db, "overview", 1000, query);
    expect(cachedAnalytics(db, "overview", 1000, query)).toBe(first);
    await expect(first).resolves.toBe(42);
    await cachedAnalytics(db, "overview", 1000, query);
    expect(query).toHaveBeenCalledTimes(1);
    await cachedAnalytics(otherDb, "overview", 1000, query);
    expect(query).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1001);
    await cachedAnalytics(db, "overview", 1000, query);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("retries failed work instead of retaining rejected promises", async () => {
    const db = {} as Database;
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(7);
    await expect(cachedAnalytics(db, "geo", 1000, query)).rejects.toThrow("database unavailable");
    await expect(cachedAnalytics(db, "geo", 1000, query)).resolves.toBe(7);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
