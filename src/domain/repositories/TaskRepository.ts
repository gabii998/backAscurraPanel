import type { Task } from "../entities/Task";

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  listByProject(projectId: string): Promise<Task[]>;
  create(task: Task): Promise<Task>;
  update(id: string, data: Partial<Omit<Task, "id" | "projectId" | "createdAt" | "deletedAt">>): Promise<Task | null>;
  softDelete(id: string): Promise<boolean>;
}
