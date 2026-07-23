import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto.js";

describe("crypto AES-256-GCM secret encryption", () => {
  const secretKey = "super-secret-jwt-key-32-chars-long!!";
  const plainTextSecret = "JBSWY3DPEHPK3PXP";

  it("should encrypt and decrypt a string secret successfully", () => {
    const encrypted = encryptSecret(plainTextSecret, secretKey);
    expect(encrypted).not.toEqual(plainTextSecret);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptSecret(encrypted, secretKey);
    expect(decrypted).toEqual(plainTextSecret);
  });

  it("should fail to decrypt with wrong secret key", () => {
    const encrypted = encryptSecret(plainTextSecret, secretKey);
    expect(() => decryptSecret(encrypted, "wrong-key-secret-key-32-chars!!")).toThrow();
  });

  it("should throw error if payload format is malformed", () => {
    expect(() => decryptSecret("invalid-payload", secretKey)).toThrow(
      "Invalid encrypted payload format",
    );
  });
});
