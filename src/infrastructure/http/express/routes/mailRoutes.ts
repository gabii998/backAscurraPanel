import { Router, type RequestHandler } from "express";
import type { MailController } from "../../../../interfaces/http/controllers/MailController";
import { wrapRequestHandler } from "../wrapRequestHandler";
import { requireRole } from "../middleware/roleMiddleware";

export const buildMailRoutes = (
  controller:          MailController,
  authMiddleware:      RequestHandler,
  ingestKeyMiddleware: RequestHandler,
): Router => {
  const router = Router();

  // Public — API key auth
  router.post("/mail/send", ingestKeyMiddleware, wrapRequestHandler(controller.handleSend.bind(controller)));

  // Configs — JWT + admin
  router.get("/mail/configs",     authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleListConfigs.bind(controller)));
  router.post("/mail/configs",    authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleCreateConfig.bind(controller)));
  router.put("/mail/configs/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleUpdateConfig.bind(controller)));
  router.delete("/mail/configs/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleDeleteConfig.bind(controller)));

  // Logs — JWT, anidados bajo config
  router.get("/mail/configs/:configId/logs", authMiddleware, wrapRequestHandler(controller.handleListLogs.bind(controller)));

  // Templates — JWT, anidados bajo config
  router.get("/mail/configs/:configId/templates",        authMiddleware, wrapRequestHandler(controller.handleListTemplates.bind(controller)));
  router.post("/mail/configs/:configId/templates",       authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleCreateTemplate.bind(controller)));
  router.put("/mail/configs/:configId/templates/:id",    authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleUpdateTemplate.bind(controller)));
  router.delete("/mail/configs/:configId/templates/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleDeleteTemplate.bind(controller)));

  return router;
};
