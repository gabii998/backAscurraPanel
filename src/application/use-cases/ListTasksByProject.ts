import type { TaskRepository } from "../../domain/repositories/TaskRepository";
import type { Task } from "../../domain/entities/Task";

export class ListTasksByProject {
  constructor(private readonly repository: TaskRepository) {}

  async execute(projectId: string): Promise<Task[]> {
    return this.repository.listByProject(projectId);
  }
}
