import { Algorithm, hash, verify } from "@node-rs/argon2";
const options = { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };
export const hashPassword = (password: string) => hash(password, options);
export const verifyPassword = (passwordHash: string, password: string) =>
  verify(passwordHash, password, options);
