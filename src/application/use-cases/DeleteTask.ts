import type { TaskRepository } from "../../domain/repositories/TaskRepository";

export class DeleteTask {
  constructor(private readonly repository: TaskRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) throw new Error("TASK_NOT_FOUND");
  }
}
