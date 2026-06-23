import { Router, type RequestHandler } from "express";
import type { WorkspaceController } from "../../../../interfaces/http/controllers/WorkspaceController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildWorkspaceRoutes = (
  controller: WorkspaceController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.use(authMiddleware);
  router.get("/workspace", wrapRequestHandler(controller.handleGet.bind(controller)));
  router.patch("/workspace", wrapRequestHandler(controller.handleUpdate.bind(controller)));

  return router;
};
