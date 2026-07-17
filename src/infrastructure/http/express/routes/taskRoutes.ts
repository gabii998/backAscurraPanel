import { Router, type RequestHandler } from "express";
import type { TaskController } from "../../../../interfaces/http/controllers/TaskController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildTaskRoutes = (
  controller: TaskController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.put("/tasks/:id", authMiddleware, wrapRequestHandler(controller.handleUpdate.bind(controller)));
  router.delete("/tasks/:id", authMiddleware, wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
