import { Router, type RequestHandler } from "express";
import type { ApiKeyController } from "../../../../interfaces/http/controllers/ApiKeyController";
import { wrapRequestHandler } from "../wrapRequestHandler";
import { requireRole } from "../middleware/roleMiddleware";

export const buildApiKeyRoutes = (
  controller: ApiKeyController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();

  router.post("/api-keys",       authMiddleware, requireRole('admin'), wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.get("/api-keys",        authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.delete("/api-keys/:id", authMiddleware, requireRole('admin'), wrapRequestHandler(controller.handleRevoke.bind(controller)));

  return router;
};
