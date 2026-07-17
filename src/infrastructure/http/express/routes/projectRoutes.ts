import { Router, type RequestHandler } from "express";
import type { ProjectController } from "../../../../interfaces/http/controllers/ProjectController";
import type { TaskController } from "../../../../interfaces/http/controllers/TaskController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildProjectRoutes = (
  projectController: ProjectController,
  taskController: TaskController,
  authMiddleware: RequestHandler
): Router => {
  const router = Router();

  router.get("/projects", authMiddleware, wrapRequestHandler(projectController.handleList.bind(projectController)));
  router.post("/projects", authMiddleware, wrapRequestHandler(projectController.handleCreate.bind(projectController)));
  router.get("/projects/:id", authMiddleware, wrapRequestHandler(projectController.handleGet.bind(projectController)));
  router.put("/projects/:id", authMiddleware, wrapRequestHandler(projectController.handleUpdate.bind(projectController)));
  router.delete("/projects/:id", authMiddleware, wrapRequestHandler(projectController.handleDelete.bind(projectController)));

  router.get("/projects/:id/tasks", authMiddleware, wrapRequestHandler(taskController.handleListByProject.bind(taskController)));
  router.post("/projects/:id/tasks", authMiddleware, wrapRequestHandler(taskController.handleCreate.bind(taskController)));

  return router;
};
