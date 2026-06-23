import { randomUUID } from "crypto";
import type { TaskRepository } from "../../domain/repositories/TaskRepository";
import type { TaskCreateData } from "../../domain/model/TaskCreateData";
import type { Task } from "../../domain/entities/Task";

export class CreateTask {
  constructor(private readonly repository: TaskRepository) {}

  async execute(data: TaskCreateData): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? "",
      priority: data.priority ?? "medium",
      column: data.column ?? "backlog",
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
