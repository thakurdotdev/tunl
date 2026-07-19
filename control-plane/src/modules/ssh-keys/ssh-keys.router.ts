import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { sshKeys } from "../../db/schema.js";
import { parsePublicKey } from "../../lib/ssh-key.js";
import { conflict, notFound } from "../../platform/errors.js";
import { asyncRoute } from "../../platform/http.js";

const createKey = z.object({
  publicKey: z
    .string()
    .min(20, "Public key must be at least 20 characters")
    .max(16_384, "Public key is too long"),
  label: z.string().max(100, "Label must be at most 100 characters").default(""),
});
const output = {
  id: sshKeys.id,
  fingerprint: sshKeys.fingerprint,
  label: sshKeys.label,
  createdAt: sshKeys.createdAt,
};
export function sshKeysRouter(db: Database) {
  const router = Router();
  router.get(
    "/",
    asyncRoute(async (req, res) =>
      res.json(
        await db
          .select(output)
          .from(sshKeys)
          .where(eq(sshKeys.userId, req.userId!))
          .orderBy(desc(sshKeys.createdAt)),
      ),
    ),
  );
  router.post(
    "/",
    asyncRoute(async (req, res) => {
      const input = createKey.parse(req.body);
      const parsed = parsePublicKey(input.publicKey);
      try {
        const [created] = await db
          .insert(sshKeys)
          .values({
            userId: req.userId!,
            publicKey: parsed.publicKey,
            fingerprint: parsed.fingerprint,
            label: input.label,
          })
          .returning(output);
        res.status(201).json(created);
      } catch (error) {
        if (isUniqueViolation(error)) throw conflict("this SSH key is already registered");
        throw error;
      }
    }),
  );
  router.delete(
    "/:id",
    asyncRoute(async (req, res) => {
      const id = z.string().uuid().parse(req.params.id);
      const deleted = await db
        .delete(sshKeys)
        .where(and(eq(sshKeys.id, id), eq(sshKeys.userId, req.userId!)))
        .returning({ id: sshKeys.id });
      if (!deleted.length) throw notFound("SSH key not found");
      res.status(204).send();
    }),
  );
  return router;
}
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
