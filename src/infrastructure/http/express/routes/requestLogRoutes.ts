import { Router, type RequestHandler } from "express";
import type { RequestLogController } from "../../../../interfaces/http/controllers/RequestLogController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildRequestLogRoutes = (
  controller:     RequestLogController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();

  router.get("/request-logs", authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));

  return router;
};
