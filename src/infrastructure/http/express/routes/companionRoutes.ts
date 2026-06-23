import { Router, type RequestHandler } from "express";
import { wrapRequestHandler } from "../wrapRequestHandler";
import { CompanionController } from "../../../../interfaces/http/controllers/CompanionController";

export function buildCompanionRoutes(
  authMiddleware: RequestHandler
): Router {
  const router = Router();
  const controller = new CompanionController();

  router.post("/companion/ping",   authMiddleware, wrapRequestHandler(controller.handlePing));
  router.get("/companion/status",  authMiddleware, wrapRequestHandler(controller.handleStatus));

  return router;
}
