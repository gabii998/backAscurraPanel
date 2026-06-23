import type { WorkspaceRepository } from "../../domain/repositories/WorkspaceRepository";
import type { Workspace } from "../../domain/entities/Workspace";
import { prisma } from "../db/prisma";

const SINGLETON_ID = "workspace-singleton";

export class PrismaWorkspaceRepository implements WorkspaceRepository {
  async get(): Promise<Workspace> {
    const row = await prisma.workspace.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
    return this.toEntity(row);
  }

  async update(data: { name?: string; timezone?: string; language?: string }): Promise<Workspace> {
    const row = await prisma.workspace.update({
      where: { id: SINGLETON_ID },
      data,
    });
    return this.toEntity(row);
  }

  private toEntity(row: {
    id: string;
    name: string;
    timezone: string;
    language: string;
    inviteToken: string;
    updatedAt: Date;
    createdAt: Date;
  }): Workspace {
    return {
      id: row.id,
      name: row.name,
      timezone: row.timezone,
      language: row.language,
      inviteToken: row.inviteToken,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  }
}
