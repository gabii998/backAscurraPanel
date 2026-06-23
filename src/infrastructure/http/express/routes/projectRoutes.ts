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

  router.use(authMiddleware);

  router.get("/projects", wrapRequestHandler(projectController.handleList.bind(projectController)));
  router.post("/projects", wrapRequestHandler(projectController.handleCreate.bind(projectController)));
  router.get("/projects/:id", wrapRequestHandler(projectController.handleGet.bind(projectController)));
  router.put("/projects/:id", wrapRequestHandler(projectController.handleUpdate.bind(projectController)));
  router.delete("/projects/:id", wrapRequestHandler(projectController.handleDelete.bind(projectController)));

  router.get("/projects/:id/tasks", wrapRequestHandler(taskController.handleListByProject.bind(taskController)));
  router.post("/projects/:id/tasks", wrapRequestHandler(taskController.handleCreate.bind(taskController)));

  return router;
};
