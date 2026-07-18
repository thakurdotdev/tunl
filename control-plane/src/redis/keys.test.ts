import { describe, expect, it } from "vitest";
import { redisKeys } from "./keys.js";

describe("redisKeys", () => {
  it("uses the control-plane namespace without exposing the source value", () => {
    const key = redisKeys.authRateLimit("login", "203.0.113.7");
    expect(key).toMatch(/^tunl:control-plane:auth-rate-limit:login:/);
    expect(key).not.toContain("203.0.113.7");
  });
});
