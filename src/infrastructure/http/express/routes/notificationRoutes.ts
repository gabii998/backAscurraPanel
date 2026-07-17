import { Router, type RequestHandler } from "express";
import type { NotificationController } from "../../../../interfaces/http/controllers/NotificationController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildNotificationRoutes = (
  controller: NotificationController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.get("/notifications", authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.get("/notifications/unread-count", authMiddleware, wrapRequestHandler(controller.handleUnreadCount.bind(controller)));
  router.patch("/notifications/read-all", authMiddleware, wrapRequestHandler(controller.handleMarkAllRead.bind(controller)));
  router.patch("/notifications/:id/read", authMiddleware, wrapRequestHandler(controller.handleMarkRead.bind(controller)));

  return router;
};
