import type { TaskRepository } from "../../domain/repositories/TaskRepository";
import type { TaskUpdateData } from "../../domain/model/TaskCreateData";
import type { Task } from "../../domain/entities/Task";

export class UpdateTask {
  constructor(private readonly repository: TaskRepository) {}

  async execute(id: string, data: TaskUpdateData): Promise<Task> {
    const updated = await this.repository.update(id, data);
    if (!updated) throw new Error("TASK_NOT_FOUND");
    return updated;
  }
}
