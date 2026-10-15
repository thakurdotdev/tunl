import { describe, expect, it, vi } from "vitest";
import { verifyUserCustomDomain } from "./verify.service.js";

function dbWithRow(row: Record<string, unknown>, finalStatus = "verified") {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  let selectCalls = 0;
  const makeSelectChain = (rows: unknown[]) => {
    // Emulate drizzle: chain is awaitable via .then, plus .limit() for first fetch.
    const sel: Record<string, (...args: unknown[]) => unknown> = {};
    sel.from = vi.fn(() => sel);
    sel.where = vi.fn(() => sel);
    sel.limit = vi.fn(async () => rows);
    // oxlint-disable-next-line unicorn/no-thenable
    sel.then = ((resolve: (v: unknown) => void) => Promise.resolve(rows).then(resolve)) as never;
    return sel;
  };
  chain.select = vi.fn(() => {
    selectCalls += 1;
    // 1st select: fetch domain row. 2nd select (only on status flip):
    // fetch ssh keys for validate-key bust.
    if (selectCalls <= 1) return makeSelectChain([row]);
    return makeSelectChain([]);
  });
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(async () => [row]);
  chain.update = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  (chain as Record<string, unknown>).returning = vi.fn(async () => [
    {
      id: row.id,
      domain: row.domain,
      status: finalStatus,
      verifiedAt: new Date(),
      lastCheckedAt: new Date(),
    },
  ]);
  return chain;
}

const redisStub = () => ({
  del: vi.fn(async () => 1),
  publish: vi.fn(async () => 1),
});

const baseRow = {
  id: "domain-id",
  userId: "user-1",
  domain: "app.example.com",
  domainLower: "app.example.com",
  verificationToken: "tok123",
  status: "pending",
  verifiedAt: null,
};

describe("verifyUserCustomDomain", () => {
  it("verifies via matching TXT record", async () => {
    const db = dbWithRow(baseRow);
    const redis = redisStub();
    const result = await verifyUserCustomDomain(
      db as never,
      redis as never,
      "user-1",
      "domain-id",
      "tunl.online",
      {
        resolveTxt: async () => [["tok123"]],
        resolveCname: async () => {
          throw Object.assign(new Error("nope"), { code: "ENOTFOUND" });
        },
      },
    );
    expect(result.verified).toBe(true);
    expect(redis.del).toHaveBeenCalled();
  });

  it("verifies via CNAME fallback when TXT is missing", async () => {
    const db = dbWithRow(baseRow);
    const redis = redisStub();
    const lookup = {
      resolveTxt: async () => {
        throw Object.assign(new Error("missing"), { code: "ENOTFOUND" });
      },
      resolveCname: async () => ["cname.tunl.online."],
    };
    const result = await verifyUserCustomDomain(
      db as never,
      redis as never,
      "user-1",
      "domain-id",
      "tunl.online",
      lookup,
    );
    expect(result.verified).toBe(true);
  });

  it("fails when neither TXT nor CNAME matches", async () => {
    const failedRow = { ...baseRow, status: "failed" };
    const db = dbWithRow(failedRow, "failed");
    const redis = redisStub();
    const lookup = {
      resolveTxt: async () => [["wrong-token"]],
      resolveCname: async () => ["other.example.net."],
    };
    const result = await verifyUserCustomDomain(
      db as never,
      redis as never,
      "user-1",
      "domain-id",
      "tunl.online",
      lookup,
    );
    expect(result.verified).toBe(false);
    expect(result.detail).toContain("CNAME");
    // Status didn't flip (failed -> failed), so SSH banner cache is untouched.
    expect(redis.del).not.toHaveBeenCalled();
  });
});
