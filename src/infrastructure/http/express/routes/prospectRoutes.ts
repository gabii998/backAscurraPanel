import { Router, type RequestHandler } from "express";
import type { ProspectController } from "../../../../interfaces/http/controllers/ProspectController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildProspectRoutes = (
  controller: ProspectController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();
  router.use(authMiddleware);

  router.post("/prospects/bulk",  wrapRequestHandler(controller.handleBulkCreate.bind(controller)));
  router.post("/prospects",       wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.get("/prospects",        wrapRequestHandler(controller.handleList.bind(controller)));
  router.patch("/prospects/:id",  wrapRequestHandler(controller.handleUpdate.bind(controller)));
  router.delete("/prospects/:id", wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
