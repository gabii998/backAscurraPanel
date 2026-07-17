import { Router, type RequestHandler } from "express";
import type { ClientController } from "../../../../interfaces/http/controllers/ClientController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildClientRoutes = (
  controller: ClientController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.get("/clients", authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.post("/clients", authMiddleware, wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.get("/clients/:id", authMiddleware, wrapRequestHandler(controller.handleGet.bind(controller)));
  router.put("/clients/:id", authMiddleware, wrapRequestHandler(controller.handleUpdate.bind(controller)));
  router.delete("/clients/:id", authMiddleware, wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
