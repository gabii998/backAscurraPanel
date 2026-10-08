import type { ProjectRepository, ListProjectsFilter } from "../../domain/repositories/ProjectRepository";
import type { Project, ProjectStatus } from "../../domain/entities/Project";
import { prisma } from "../db/prisma";

import { DEFAULT_PROJECT_COLUMNS, validateProjectColumns } from "../../domain/entities/ProjectColumn";

export class PrismaProjectRepository implements ProjectRepository {
  async findById(id: string): Promise<Project | null> {
    const row = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: { members: true },
    });
    return row ? this.toEntity(row) : null;
  }

  async list(filter: ListProjectsFilter): Promise<Project[]> {
    const rows = await prisma.project.findMany({
      where: {
        deletedAt: null,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.query
          ? {
              OR: [
                { name: { contains: filter.query, mode: "insensitive" } },
                { stack: { contains: filter.query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { members: true },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(project: Project): Promise<Project> {
    await prisma.project.create({
      data: {
        id: project.id,
        name: project.name,
        stack: project.stack,
        status: project.status,
        progress: project.progress,
        columns: (project.columns ?? DEFAULT_PROJECT_COLUMNS).map(c => ({ ...c })),
        createdAt: project.createdAt,
        deletedAt: null,
        members: {
          create: project.memberIds.map((userId) => ({ userId })),
        },
      },
    });
    return project;
  }

  async update(
    id: string,
    data: Partial<Omit<Project, "id" | "createdAt" | "deletedAt" | "memberIds">>,
    memberIds?: string[]
  ): Promise<Project | null> {
    const existing = await prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    await prisma.$transaction(async (tx) => {
      if (data.columns !== undefined) {
        const occupied = await tx.task.count({ where: { projectId: id, deletedAt: null, column: { notIn: data.columns.map(c => c.id) } } });
        if (occupied > 0) throw new Error("COLUMN_HAS_TASKS");
      }
      const { columns, ...fields } = data;
      await tx.project.update({ where: { id }, data: { ...fields, ...(columns ? { columns: columns.map(c => ({ ...c })) } : {}) } });
      if (memberIds !== undefined) {
        await tx.projectMember.deleteMany({ where: { projectId: id } });
        if (memberIds.length > 0) {
          await tx.projectMember.createMany({
            data: memberIds.map((userId) => ({ projectId: id, userId })),
          });
        }
      }
    }, { isolationLevel: "Serializable" });

    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return false;
    await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  private toEntity(row: {
    id: string;
    name: string;
    stack: string;
    status: string;
    progress: number;
    updatedAt: Date;
    createdAt: Date;
    deletedAt: Date | null;
    members: { userId: string }[];
    columns: unknown;
  }): Project {
    return {
      id: row.id,
      name: row.name,
      stack: row.stack,
      status: row.status as ProjectStatus,
      progress: row.progress,
      columns: validateProjectColumns(row.columns),
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
      memberIds: row.members.map((m) => m.userId),
    };
  }
}
