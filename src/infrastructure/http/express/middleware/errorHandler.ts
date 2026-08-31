import type { ErrorRequestHandler, RequestHandler, Request, Response, NextFunction } from "express";

type HttpError = Error & { status?: number; statusCode?: number };

const resolveStatusCode = (error: unknown): number => {
  if (error instanceof SyntaxError) return 400;
  if (typeof (error as { code?: unknown })?.code === "string") {
    const code = (error as { code: string }).code;
    if (code === "LIMIT_FILE_SIZE") return 413;
    if (code === "LIMIT_UNEXPECTED_FILE") return 400;
  }
  const e = error as HttpError;
  if (typeof e?.statusCode === "number") return e.statusCode;
  if (typeof e?.status === "number") return e.status;
  return 500;
};

const resolveMessage = (error: unknown, statusCode: number): string => {
  if (error instanceof SyntaxError) return "INVALID_JSON";
  if ((error as { code?: unknown })?.code === "LIMIT_FILE_SIZE") return "FILE_TOO_LARGE";
  if ((error as { code?: unknown })?.code === "LIMIT_UNEXPECTED_FILE") return "INVALID_IMAGE_UPLOAD";
  if (statusCode < 500 && error instanceof Error && error.message) return error.message;
  return "INTERNAL_SERVER_ERROR";
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "ROUTE_NOT_FOUND" });
};

export const buildErrorHandler = (): ErrorRequestHandler =>
  (error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) { next(error); return; }

    const statusCode = resolveStatusCode(error);
    const message    = resolveMessage(error, statusCode);

    res.locals.errorMessage = error instanceof Error ? error.message : String(error);

    console.error("Unhandled request error:", req.method, req.originalUrl, `(${statusCode})`);
    console.error(error);

    res.status(statusCode).json({ message });
  };
