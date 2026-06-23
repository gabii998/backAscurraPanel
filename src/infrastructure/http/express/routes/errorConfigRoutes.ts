import { Router, type RequestHandler } from "express";
import type { ErrorConfigController } from "../../../../interfaces/http/controllers/ErrorConfigController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildErrorConfigRoutes = (
  controller: ErrorConfigController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();
  router.use(authMiddleware);

  router.post("/error-configs",      wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.get("/error-configs",       wrapRequestHandler(controller.handleList.bind(controller)));
  router.get("/error-configs/:id",   wrapRequestHandler(controller.handleGet.bind(controller)));
  router.delete("/error-configs/:id", wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
