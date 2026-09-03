import { Router, type RequestHandler } from "express";
import multer from "multer";
import type { PortfolioProjectController } from "../../../../interfaces/http/controllers/PortfolioProjectController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildPortfolioProjectRoutes = (
  controller: PortfolioProjectController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  // Público — el landing consume esto
  router.get("/portfolio-projects", wrapRequestHandler(controller.handleList.bind(controller)));

  // Protegido — gestión desde el panel
  router.post("/portfolio-projects", authMiddleware, upload.single("image"), wrapRequestHandler(controller.handleCreate.bind(controller)));
  router.patch("/portfolio-projects/reorder", authMiddleware, wrapRequestHandler(controller.handleReorder.bind(controller)));
  router.get("/portfolio-projects/:id", authMiddleware, wrapRequestHandler(controller.handleGet.bind(controller)));
  router.put("/portfolio-projects/:id", authMiddleware, upload.single("image"), wrapRequestHandler(controller.handleUpdate.bind(controller)));
  router.delete("/portfolio-projects/:id", authMiddleware, wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
