import { Router, type RequestHandler } from "express";
import type { ClientController } from "../../../../interfaces/http/controllers/ClientController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildClientRoutes = (
  controller: ClientController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.use(authMiddleware);
  router.get("/clients", wrapRequestHandler(controller.handleList.bind(controller)));
  router.post("/clients", wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.get("/clients/:id", wrapRequestHandler(controller.handleGet.bind(controller)));
  router.put("/clients/:id", wrapRequestHandler(controller.handleUpdate.bind(controller)));
  router.delete("/clients/:id", wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
