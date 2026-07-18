import { createHash } from "node:crypto";
import { utils } from "ssh2";
import { badRequest } from "../platform/errors.js";

export function parsePublicKey(publicKey: string) {
  const key = utils.parseKey(publicKey.trim());
  if (key instanceof Error || key.isPrivateKey())
    throw badRequest("publicKey must be a valid OpenSSH public key");
  const blob = key.getPublicSSH();
  return {
    publicKey: publicKey.trim(),
    fingerprint: `SHA256:${createHash("sha256").update(blob).digest("base64").replace(/=+$/, "")}`,
  };
}
