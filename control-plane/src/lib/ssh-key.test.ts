import { describe, expect, it } from "vitest";
import { parsePublicKey } from "./ssh-key.js";

describe("parsePublicKey", () => {
  it("produces the OpenSSH SHA256 fingerprint", () => {
    const key =
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOKkv7Uis/629J1YAFZc1/KDuJAuY7lytDG/g0cTorD0 test@example";
    expect(parsePublicKey(key).fingerprint).toBe(
      "SHA256:eXEnesiwH/oo9vizNTV8cpPlHzExJWYg4nzIZIoorys",
    );
  });
  it("rejects malformed keys", () =>
    expect(() => parsePublicKey("not an ssh key")).toThrow("valid OpenSSH public key"));
});
