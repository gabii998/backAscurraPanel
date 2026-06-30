import { Router, type RequestHandler } from "express";
import type { ContactController } from "../../../../interfaces/http/controllers/ContactController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildContactRoutes = (
  controller: ContactController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();

  // Public — landing page form submission
  router.post("/contact-requests", wrapRequestHandler(controller.handleCreate.bind(controller)));

  // Protected — dashboard management
  router.get("/contact-requests",        authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.patch("/contact-requests/:id",  authMiddleware, wrapRequestHandler(controller.handleUpdateStatus.bind(controller)));

  return router;
};
