import { SignJWT, jwtVerify } from "jose";
import type { Config } from "../../platform/config.js";
import { unauthorized } from "../../platform/errors.js";

const keyFor = (config: Config) => new TextEncoder().encode(config.JWT_SECRET);
export async function issueAccessToken(config: Config, userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(config.JWT_ISSUER)
    .setAudience(config.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keyFor(config));
}
export async function verifyAccessToken(config: Config, token: string) {
  try {
    const { payload } = await jwtVerify(token, keyFor(config), {
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    });
    if (!payload.sub) throw unauthorized();
    return payload.sub;
  } catch {
    throw unauthorized();
  }
}
