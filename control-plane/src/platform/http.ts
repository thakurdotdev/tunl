import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors.js";

export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};
export const asyncRoute =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const requestId = res.locals.requestId ?? "unknown";
  if (error instanceof ZodError)
    return void res.status(400).json({
      error: { code: "validation_error", message: "request validation failed", requestId },
    });
  if (error instanceof AppError)
    return void res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message, requestId } });
  console.error({ requestId, error }, "unhandled request error");
  res
    .status(500)
    .json({ error: { code: "internal_error", message: "internal server error", requestId } });
};
