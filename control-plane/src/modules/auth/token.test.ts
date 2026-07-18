import { describe, expect, it } from "vitest";
import type { Config } from "../../platform/config.js";
import { issueAccessToken, verifyAccessToken } from "./token.js";

const config: Config = {
  DATABASE_URL: "postgres://user:password@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379/0",
  JWT_SECRET: "a-very-long-test-secret-that-is-at-least-32-characters",
  INTERNAL_SHARED_SECRET: "a-test-internal-secret-at-least-16",
  PORT: 3001,
  JWT_ISSUER: "test-issuer",
  JWT_AUDIENCE: "test-audience",
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "Tunl <noreply@example.test>",
  DASHBOARD_URL: "https://app.example.test",
};

describe("access tokens", () => {
  it("round-trips a user subject", async () => {
    const token = await issueAccessToken(config, "4c16c227-3a9e-4c36-86dd-0d1a9ad0bc17");
    await expect(verifyAccessToken(config, token)).resolves.toBe(
      "4c16c227-3a9e-4c36-86dd-0d1a9ad0bc17",
    );
  });
  it("rejects a token signed with a different secret", async () => {
    const token = await issueAccessToken(config, "user");
    await expect(
      verifyAccessToken(
        { ...config, JWT_SECRET: "another-long-secret-that-is-at-least-32" },
        token,
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
});
