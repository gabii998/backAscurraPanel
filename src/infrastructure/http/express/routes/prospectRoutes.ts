import { Router, type RequestHandler } from "express";
import type { ProspectController } from "../../../../interfaces/http/controllers/ProspectController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildProspectRoutes = (
  controller: ProspectController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();

  router.post("/prospects/bulk",  authMiddleware, wrapRequestHandler(controller.handleBulkCreate.bind(controller)));
  router.post("/prospects",       authMiddleware, wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.get("/prospects",        authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.patch("/prospects/:id",  authMiddleware, wrapRequestHandler(controller.handleUpdate.bind(controller)));
  router.delete("/prospects/:id", authMiddleware, wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
