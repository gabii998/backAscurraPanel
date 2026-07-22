import { Router, type RequestHandler } from "express";
import type { BrandController } from "../../../../interfaces/http/controllers/BrandController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildBrandRoutes = (
  controller:     BrandController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();

  router.get("/brands",     authMiddleware, wrapRequestHandler(controller.handleList.bind(controller)));
  router.post("/brands",    authMiddleware, wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.get("/brands/:id", authMiddleware, wrapRequestHandler(controller.handleGet.bind(controller)));
  router.put("/brands/:id", authMiddleware, wrapRequestHandler(controller.handleUpdate.bind(controller)));
  router.delete("/brands/:id", authMiddleware, wrapRequestHandler(controller.handleDelete.bind(controller)));

  router.get("/brands/:id/examples",        authMiddleware, wrapRequestHandler(controller.handleListExamples.bind(controller)));
  router.post("/brands/:id/examples",       authMiddleware, wrapRequestHandler(controller.handleCreateExample.bind(controller)));
  router.delete("/brands/:id/examples/:exId", authMiddleware, wrapRequestHandler(controller.handleDeleteExample.bind(controller)));

  return router;
};
