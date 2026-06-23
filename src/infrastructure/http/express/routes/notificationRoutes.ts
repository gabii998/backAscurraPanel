import { Router, type RequestHandler } from "express";
import type { NotificationController } from "../../../../interfaces/http/controllers/NotificationController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildNotificationRoutes = (
  controller: NotificationController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.use(authMiddleware);
  router.get("/notifications", wrapRequestHandler(controller.handleList.bind(controller)));
  router.get("/notifications/unread-count", wrapRequestHandler(controller.handleUnreadCount.bind(controller)));
  router.patch("/notifications/read-all", wrapRequestHandler(controller.handleMarkAllRead.bind(controller)));
  router.patch("/notifications/:id/read", wrapRequestHandler(controller.handleMarkRead.bind(controller)));

  return router;
};
