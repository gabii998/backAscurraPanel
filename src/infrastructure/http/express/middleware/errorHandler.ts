import type { ErrorRequestHandler, Request, RequestHandler, Response, NextFunction } from "express";
import type { RequestLogRepository } from "../../../../domain/repositories/RequestLogRepository";

type HttpError = Error & { status?: number; statusCode?: number };

const resolveStatusCode = (error: unknown): number => {
  if (error instanceof SyntaxError) return 400;
  const e = error as HttpError;
  if (typeof e?.statusCode === "number") return e.statusCode;
  if (typeof e?.status === "number") return e.status;
  return 500;
};

const resolveMessage = (error: unknown, statusCode: number): string => {
  if (error instanceof SyntaxError) return "INVALID_JSON";
  if (statusCode < 500 && error instanceof Error && error.message) return error.message;
  return "INTERNAL_SERVER_ERROR";
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "ROUTE_NOT_FOUND" });
};

export const buildErrorHandler = (logRepo: RequestLogRepository): ErrorRequestHandler =>
  (error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) { next(error); return; }

    const statusCode = resolveStatusCode(error);
    const message    = resolveMessage(error, statusCode);

    if (statusCode >= 500) {
      const responseBody = JSON.stringify({ message });
      logRepo.create({
        method:       req.method,
        path:         req.originalUrl,
        statusCode,
        requestBody:  req.body && typeof req.body === "object" && Object.keys(req.body).length
          ? JSON.stringify(req.body)
          : null,
        responseBody,
        errorMessage: error instanceof Error ? error.message : String(error),
      }).catch(err => console.error("[RequestLog] Failed to write log:", err));
    }

    console.error("Unhandled request error:", req.method, req.originalUrl, `(${statusCode})`);
    console.error(error);

    res.status(statusCode).json({ message });
  };
