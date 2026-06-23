import { Router, type RequestHandler } from "express";
import type { UserController } from "../../../../interfaces/http/controllers/UserController";
import { wrapRequestHandler } from "../wrapRequestHandler";
import { requireRole } from "../middleware/roleMiddleware";

export const buildUserRoutes = (
  controller: UserController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.use(authMiddleware);

  // /me routes must come BEFORE /:id so Express doesn't treat "me" as an id
  router.get("/users/me", wrapRequestHandler(controller.handleGetMe.bind(controller)));
  router.patch("/users/me", wrapRequestHandler(controller.handleUpdateMe.bind(controller)));
  router.patch("/users/me/password", wrapRequestHandler(controller.handleChangePassword.bind(controller)));
  router.get("/users/me/notifications", wrapRequestHandler(controller.handleGetNotifications.bind(controller)));
  router.patch("/users/me/notifications", wrapRequestHandler(controller.handleUpdateNotifications.bind(controller)));
  router.get("/users/me/sessions", wrapRequestHandler(controller.handleGetSessions.bind(controller)));
  router.delete("/users/me/sessions/:id", wrapRequestHandler(controller.handleRevokeSession.bind(controller)));

  router.get("/users", wrapRequestHandler(controller.handleList.bind(controller)));
  router.post("/users", requireRole('admin'), wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.delete("/users/:id", requireRole('admin'), wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
