import { Router, type RequestHandler } from "express";
import type { StatsController } from "../../../../interfaces/http/controllers/StatsController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildStatsRoutes = (controller: StatsController, authMiddleware: RequestHandler): Router => {
  const router = Router();
  router.get("/stats/overview", authMiddleware, wrapRequestHandler(controller.handleOverview.bind(controller)));
  router.get("/stats/reports", authMiddleware, wrapRequestHandler(controller.handleReports.bind(controller)));
  return router;
};
