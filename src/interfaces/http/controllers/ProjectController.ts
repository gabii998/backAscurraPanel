import type { Request, Response } from "express";
import type { CreateProject } from "../../../application/use-cases/CreateProject";
import type { ListProjects } from "../../../application/use-cases/ListProjects";
import type { GetProject } from "../../../application/use-cases/GetProject";
import type { UpdateProject } from "../../../application/use-cases/UpdateProject";
import type { DeleteProject } from "../../../application/use-cases/DeleteProject";
import type { NotificationDispatcher } from "../../../application/services/NotificationDispatcher";
import type { ProjectStatus } from "../../../domain/entities/Project";
import type { AuthRequest } from "../../../infrastructure/http/express/middleware/authMiddleware";

export class ProjectController {
  constructor(
    private readonly createProject: CreateProject,
    private readonly listProjects: ListProjects,
    private readonly getProject: GetProject,
    private readonly updateProject: UpdateProject,
    private readonly deleteProject: DeleteProject,
    private readonly notificationDispatcher?: NotificationDispatcher
  ) {}

  async handleList(req: Request, res: Response): Promise<void> {
    const { status, q } = req.query as Record<string, string | undefined>;
    const projects = await this.listProjects.execute({
      status: status as ProjectStatus | undefined,
      query: q,
    });
    res.json(projects);
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    const { name, stack, status, memberIds } = req.body as {
      name?: string;
      stack?: string;
      status?: ProjectStatus;
      memberIds?: string[];
    };

    if (!name || !stack) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }

    const project = await this.createProject.execute({ name, stack, status, memberIds });
    const actorId = (req as AuthRequest).user?.userId;
    if (actorId) {
      void this.notificationDispatcher?.newProject(project.id, project.name, actorId);
    }
    res.status(201).json(project);
  }

  async handleGet(req: Request, res: Response): Promise<void> {
    try {
      const project = await this.getProject.execute(req.params.id);
      res.json(project);
    } catch (error) {
      if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
        res.status(404).json({ message: "PROJECT_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
    try {
      const project = await this.updateProject.execute(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
        res.status(404).json({ message: "PROJECT_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteProject.execute(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
        res.status(404).json({ message: "PROJECT_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }
}
