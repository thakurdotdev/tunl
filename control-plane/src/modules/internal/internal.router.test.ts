import { describe, expect, it } from "vitest";
import { validateKeyBody, sessionConnectedBody } from "./internal.router.js";

describe("internal router schema validation", () => {
  it("validates validateKeyBody", () => {
    const parsed = validateKeyBody.parse({ fingerprint: "SHA256:abc123def456" });
    expect(parsed.fingerprint).toBe("SHA256:abc123def456");
  });

  it("validates sessionConnectedBody with authenticated session", () => {
    const payload = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      anonymousId: "anon-123",
      subdomain: "testing",
      remoteIp: "127.0.0.1",
      plan: "free",
      sessionType: "authenticated",
      occurredAt: new Date().toISOString(),
      eventId: "testing:connected:1",
    };
    const parsed = sessionConnectedBody.parse(payload);
    expect(parsed.userId).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(parsed.subdomain).toBe("testing");
    expect(parsed.sessionType).toBe("authenticated");
  });
});
