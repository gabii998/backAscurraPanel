import { Router, type RequestHandler } from "express";
import type { MPController } from "../../../../interfaces/http/controllers/MPController";
import { wrapRequestHandler } from "../wrapRequestHandler";
import { requireRole } from "../middleware/roleMiddleware";

export const buildMPRoutes = (
  controller:          MPController,
  authMiddleware:      RequestHandler,
  ingestKeyMiddleware: RequestHandler,
): Router => {
  const router = Router();

  // Pública — API key
  router.post("/mp/pay",                   ingestKeyMiddleware, wrapRequestHandler(controller.handleCreatePreference.bind(controller)));
  router.get("/mp/payment/:paymentId",     ingestKeyMiddleware, wrapRequestHandler(controller.handleGetPayment.bind(controller)));

  // Webhook de MercadoPago — sin auth
  router.post("/mp/webhook/:configName", wrapRequestHandler(controller.handleWebhook.bind(controller)));

  // Configs — JWT + admin
  router.get("/mp/configs",     authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleListConfigs.bind(controller)));
  router.post("/mp/configs",    authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleCreateConfig.bind(controller)));
  router.put("/mp/configs/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleUpdateConfig.bind(controller)));
  router.delete("/mp/configs/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleDeleteConfig.bind(controller)));

  // Logs — JWT
  router.get("/mp/configs/:configId/logs", authMiddleware, wrapRequestHandler(controller.handleListLogs.bind(controller)));

  return router;
};
