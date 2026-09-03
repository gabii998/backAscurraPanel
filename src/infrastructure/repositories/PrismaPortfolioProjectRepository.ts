import type { PortfolioProjectRepository } from "../../domain/repositories/PortfolioProjectRepository";
import type { PortfolioProject } from "../../domain/entities/PortfolioProject";
import { prisma } from "../db/prisma";

export class PrismaPortfolioProjectRepository implements PortfolioProjectRepository {
  async findById(id: string): Promise<PortfolioProject | null> {
    const row = await prisma.portfolioProject.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async list(): Promise<PortfolioProject[]> {
    const rows = await prisma.portfolioProject.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map((r) => this.toEntity(r));
  }

  async count(): Promise<number> {
    return prisma.portfolioProject.count();
  }

  async create(project: PortfolioProject): Promise<PortfolioProject> {
    await prisma.portfolioProject.create({
      data: {
        id: project.id,
        tag: project.tag,
        title: project.title,
        description: project.description,
        tech: project.tech,
        imageUrl: project.imageUrl,
        objectKey: project.objectKey,
        sortOrder: project.sortOrder,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
    return project;
  }

  async update(
    id: string,
    data: Partial<Omit<PortfolioProject, "id" | "createdAt">>
  ): Promise<PortfolioProject | null> {
    const existing = await prisma.portfolioProject.findUnique({ where: { id } });
    if (!existing) return null;
    await prisma.portfolioProject.update({ where: { id }, data });
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await prisma.portfolioProject.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.portfolioProject.delete({ where: { id } });
    return true;
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.portfolioProject.update({ where: { id }, data: { sortOrder: index } })
      )
    );
  }

  private toEntity(row: {
    id: string;
    tag: string;
    title: string;
    description: string;
    tech: string[];
    imageUrl: string;
    objectKey: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): PortfolioProject {
    return {
      id: row.id,
      tag: row.tag,
      title: row.title,
      description: row.description,
      tech: row.tech,
      imageUrl: row.imageUrl,
      objectKey: row.objectKey,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
