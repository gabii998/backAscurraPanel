import { Router, type RequestHandler } from "express";
import type { ErrorController } from "../../../../interfaces/http/controllers/ErrorController";
import type { ApiKeyRepository } from "../../../../domain/repositories/ApiKeyRepository";
import { buildIngestKeyMiddleware } from "../middleware/ingestKeyMiddleware";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildErrorRoutes = (
  controller: ErrorController,
  authMiddleware: RequestHandler,
  apiKeyRepository: ApiKeyRepository
): Router => {
  const router = Router();

  router.post("/errors/ingest", buildIngestKeyMiddleware(apiKeyRepository), wrapRequestHandler(controller.handleIngest.bind(controller)));

  router.get("/errors",            authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.get("/errors/:id",        authMiddleware, wrapRequestHandler(controller.handleGet.bind(controller)));
  router.put("/errors/:id/status", authMiddleware, wrapRequestHandler(controller.handleUpdateStatus.bind(controller)));
  router.delete("/errors/:id",     authMiddleware, wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
