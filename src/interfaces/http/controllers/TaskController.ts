import type { Request, Response } from "express";
import type { CreateTask } from "../../../application/use-cases/CreateTask";
import type { ListTasksByProject } from "../../../application/use-cases/ListTasksByProject";
import type { UpdateTask } from "../../../application/use-cases/UpdateTask";
import type { DeleteTask } from "../../../application/use-cases/DeleteTask";
import type { NotificationDispatcher } from "../../../application/services/NotificationDispatcher";
import type { TaskRepository } from "../../../domain/repositories/TaskRepository";

export class TaskController {
  constructor(
    private readonly createTask: CreateTask,
    private readonly listTasksByProject: ListTasksByProject,
    private readonly updateTask: UpdateTask,
    private readonly deleteTask: DeleteTask,
    private readonly notificationDispatcher?: NotificationDispatcher,
    private readonly taskRepository?: TaskRepository
  ) {}

  async handleListByProject(req: Request, res: Response): Promise<void> {
    const tasks = await this.listTasksByProject.execute(req.params.id);
    res.json(tasks);
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    const { title } = req.body as { title?: string };
    if (!title) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }
    const task = await this.createTask.execute({ ...req.body, projectId: req.params.id });
    if (this.notificationDispatcher && task.assigneeId) {
      void this.notificationDispatcher.taskAssigned(task.id, task.title, task.assigneeId);
    }
    res.status(201).json(task);
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      const prevAssigneeId = this.taskRepository
        ? (await this.taskRepository.findById(req.params.id))?.assigneeId ?? null
        : null;
      const task = await this.updateTask.execute(req.params.id, body);
      const newAssigneeId = body.assigneeId as string | null | undefined;
      if (this.notificationDispatcher && newAssigneeId && newAssigneeId !== prevAssigneeId) {
        void this.notificationDispatcher.taskAssigned(task.id, task.title, newAssigneeId);
      }
      res.json(task);
    } catch (error) {
      if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
        res.status(404).json({ message: "TASK_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteTask.execute(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
        res.status(404).json({ message: "TASK_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }
}
