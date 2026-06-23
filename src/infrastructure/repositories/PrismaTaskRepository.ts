import type { TaskRepository } from "../../domain/repositories/TaskRepository";
import type { Task, Priority, Column } from "../../domain/entities/Task";
import { prisma } from "../db/prisma";

export class PrismaTaskRepository implements TaskRepository {
  async findById(id: string): Promise<Task | null> {
    const row = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    return row ? this.toEntity(row) : null;
  }

  async listByProject(projectId: string): Promise<Task[]> {
    const rows = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(task: Task): Promise<Task> {
    await prisma.task.create({
      data: {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        column: task.column,
        labels: task.labels,
        dueDate: task.dueDate,
        subtasksDone: task.subtasksDone,
        subtasksTotal: task.subtasksTotal,
        assigneeId: task.assigneeId,
        createdAt: task.createdAt,
        deletedAt: null,
      },
    });
    return task;
  }

  async update(
    id: string,
    data: Partial<Omit<Task, "id" | "projectId" | "createdAt" | "deletedAt">>
  ): Promise<Task | null> {
    const existing = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    const updated = await prisma.task.update({ where: { id }, data });
    return this.toEntity(updated);
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return false;
    await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  private toEntity(row: {
    id: string;
    projectId: string;
    title: string;
    description: string;
    priority: string;
    column: string;
    labels: string[];
    dueDate: string | null;
    subtasksDone: number;
    subtasksTotal: number;
    assigneeId: string | null;
    createdAt: Date;
    deletedAt: Date | null;
  }): Task {
    return {
      id: row.id,
      projectId: row.projectId,
      title: row.title,
      description: row.description,
      priority: row.priority as Priority,
      column: row.column as Column,
      labels: row.labels,
      dueDate: row.dueDate,
      subtasksDone: row.subtasksDone,
      subtasksTotal: row.subtasksTotal,
      assigneeId: row.assigneeId,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    };
  }
}
