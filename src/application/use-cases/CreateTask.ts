import { randomUUID } from "crypto";
import type { TaskRepository } from "../../domain/repositories/TaskRepository";
import type { TaskCreateData } from "../../domain/model/TaskCreateData";
import type { Task } from "../../domain/entities/Task";

import type { ProjectRepository } from "../../domain/repositories/ProjectRepository";
import { DEFAULT_PROJECT_COLUMNS } from "../../domain/entities/ProjectColumn";

export class CreateTask {
  constructor(private readonly repository: TaskRepository, private readonly projects: ProjectRepository) {}

  async execute(data: TaskCreateData): Promise<Task> {
    const project = await this.projects.findById(data.projectId);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const columns = project.columns ?? DEFAULT_PROJECT_COLUMNS;
    const column = data.column ?? columns[0].id;
    if (!columns.some(c => c.id === column)) throw new Error("INVALID_TASK_COLUMN");
    const task: Task = {
      id: randomUUID(),
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? "",
      priority: data.priority ?? "medium",
      column,
      labels: data.labels ?? [],
      dueDate: data.dueDate ?? null,
      subtasksDone: data.subtasksDone ?? 0,
      subtasksTotal: data.subtasksTotal ?? 0,
      assigneeId: data.assigneeId ?? null,
      createdAt: new Date(),
      deletedAt: null,
    };
    return this.repository.create(task);
  }
}
