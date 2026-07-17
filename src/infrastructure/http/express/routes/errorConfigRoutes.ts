import { Router, type RequestHandler } from "express";
import type { ErrorConfigController } from "../../../../interfaces/http/controllers/ErrorConfigController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildErrorConfigRoutes = (
  controller: ErrorConfigController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();

  router.post("/error-configs",       authMiddleware, wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.get("/error-configs",        authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.get("/error-configs/:id",    authMiddleware, wrapRequestHandler(controller.handleGet.bind(controller)));
  router.delete("/error-configs/:id", authMiddleware, wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
