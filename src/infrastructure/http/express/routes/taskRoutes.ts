import { Router, type RequestHandler } from "express";
import type { TaskController } from "../../../../interfaces/http/controllers/TaskController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildTaskRoutes = (
  controller: TaskController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.use(authMiddleware);
  router.put("/tasks/:id", wrapRequestHandler(controller.handleUpdate.bind(controller)));
  router.delete("/tasks/:id", wrapRequestHandler(controller.handleDelete.bind(controller)));

  return router;
};
