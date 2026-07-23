import type { RequestHandler } from "express";
import type { RequestLogRepository } from "../../../../domain/repositories/RequestLogRepository";

export const buildRequestLoggerMiddleware = (logRepo: RequestLogRepository): RequestHandler =>
  (req, res, next) => {
    if (req.path.startsWith("/health") || req.path.startsWith("/api-docs")) {
      return next();
    }

    const startTime = Date.now();
    let responseBody: string | null = null;

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      responseBody = body != null ? JSON.stringify(body) : null;
      return originalJson(body);
    };

    res.on("finish", () => {
      const forwarded = req.headers["x-forwarded-for"];
      const ipAddress = (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ?? req.ip ?? null;

      logRepo.create({
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ipAddress,
        requestBody:
          req.body && typeof req.body === "object" && Object.keys(req.body).length
            ? JSON.stringify(req.body)
            : null,
        responseBody,
        errorMessage: (res.locals.errorMessage as string) ?? null,
        durationMs: Date.now() - startTime,
      }).catch(err => console.error("[RequestLog] Failed to write log:", err));
    });

    next();
  };
