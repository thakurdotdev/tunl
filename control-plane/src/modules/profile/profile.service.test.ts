import { describe, expect, it } from "vitest";
import { generateSecret, generateSync, verify } from "otplib";
import { decryptSecret, encryptSecret } from "../../lib/crypto.js";

describe("Profile Service & 2FA Helper Logic", () => {
  const jwtSecret = "test-jwt-secret-string-at-least-32-chars!!";

  it("should generate valid TOTP secret and verify tokens correctly", async () => {
    const secret = generateSecret();
    const token = generateSync({ secret });

    const result = await verify({ token, secret });
    expect(result.valid).toBe(true);
  });

  it("should encrypt TOTP secret before DB storage and decrypt cleanly", () => {
    const secret = generateSecret();
    const encrypted = encryptSecret(secret, jwtSecret);

    expect(encrypted).not.toEqual(secret);
    const decrypted = decryptSecret(encrypted, jwtSecret);
    expect(decrypted).toEqual(secret);
  });
});
