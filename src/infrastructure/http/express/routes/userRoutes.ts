import { Router, type RequestHandler } from "express";
import type { UserController } from "../../../../interfaces/http/controllers/UserController";
import { wrapRequestHandler } from "../wrapRequestHandler";
import { requireRole } from "../middleware/roleMiddleware";

export const buildUserRoutes = (
  controller: UserController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  // /me routes must come BEFORE /:id so Express doesn't treat "me" as an id
  router.get("/users/me", authMiddleware, wrapRequestHandler(controller.handleGetMe.bind(controller)));
  router.patch("/users/me", authMiddleware, wrapRequestHandler(controller.handleUpdateMe.bind(controller)));
  router.patch("/users/me/password", authMiddleware, wrapRequestHandler(controller.handleChangePassword.bind(controller)));
  router.get("/users/me/notifications", authMiddleware, wrapRequestHandler(controller.handleGetNotifications.bind(controller)));
  router.patch("/users/me/notifications", authMiddleware, wrapRequestHandler(controller.handleUpdateNotifications.bind(controller)));
  router.get("/users/me/sessions", authMiddleware, wrapRequestHandler(controller.handleGetSessions.bind(controller)));
  router.delete("/users/me/sessions/:id", authMiddleware, wrapRequestHandler(controller.handleRevokeSession.bind(controller)));

  router.get("/users", authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.post("/users", authMiddleware, requireRole('admin'), wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.delete("/users/:id", authMiddleware, requireRole('admin'), wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
