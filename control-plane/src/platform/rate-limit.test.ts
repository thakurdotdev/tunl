import { describe, expect, it, vi } from "vitest";
import { rateLimit, type RateLimitStore } from "./rate-limit.js";

describe("rateLimit", () => {
  it("rejects requests after the configured limit", async () => {
    const store: RateLimitStore = {
      increment: vi
        .fn()
        .mockResolvedValueOnce({ count: 1, retryAfterSeconds: 60 })
        .mockResolvedValueOnce({ count: 2, retryAfterSeconds: 60 }),
    };
    const middleware = rateLimit(store, "test", 1, 60_000);
    const req = { ip: "127.0.0.1" } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();
    middleware(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1));
    middleware(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(2));
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(next.mock.calls[1][0]).toMatchObject({ status: 429, code: "rate_limited" });
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", 60);
  });
});
