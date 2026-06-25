import { Router, type RequestHandler } from "express";
import type { WhatsAppController } from "../../../../interfaces/http/controllers/WhatsAppController";
import { wrapRequestHandler } from "../wrapRequestHandler";
import { requireRole } from "../middleware/roleMiddleware";

export const buildWhatsAppRoutes = (
  controller:          WhatsAppController,
  authMiddleware:      RequestHandler,
  ingestKeyMiddleware: RequestHandler,
): Router => {
  const router = Router();

  // Webhook — no auth (Meta sends GET for verification, POST for events)
  router.get("/whatsapp/webhook/:configName",  wrapRequestHandler(controller.handleVerifyWebhook.bind(controller)));
  router.post("/whatsapp/webhook/:configName", wrapRequestHandler(controller.handleWebhook.bind(controller)));

  // Send — API key
  router.post("/whatsapp/send", ingestKeyMiddleware, wrapRequestHandler(controller.handleSend.bind(controller)));

  // Configs — JWT + admin
  router.get("/whatsapp/configs",     authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleListConfigs.bind(controller)));
  router.post("/whatsapp/configs",    authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleCreateConfig.bind(controller)));
  router.put("/whatsapp/configs/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleUpdateConfig.bind(controller)));
  router.delete("/whatsapp/configs/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleDeleteConfig.bind(controller)));

  // API key assignment — JWT + admin
  router.post("/whatsapp/configs/:id/assign-key",              authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleAssignApiKey.bind(controller)));
  router.delete("/whatsapp/configs/:id/assign-key/:apiKeyId",  authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleUnassignApiKey.bind(controller)));

  // Messages & Logs — JWT
  router.get("/whatsapp/configs/:configId/messages", authMiddleware, wrapRequestHandler(controller.handleListMessages.bind(controller)));
  router.get("/whatsapp/configs/:configId/logs",     authMiddleware, wrapRequestHandler(controller.handleListLogs.bind(controller)));

  return router;
};
