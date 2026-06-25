import { prisma } from "../db/prisma";
import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaConfig, ArcaConfigInput } from "../../domain/entities/ArcaConfig";

export class PrismaArcaConfigRepository implements ArcaConfigRepository {
  async list(): Promise<ArcaConfig[]> {
    return prisma.arcaConfig.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getById(id: string): Promise<ArcaConfig | null> {
    return prisma.arcaConfig.findUnique({ where: { id } });
  }

  async getByApiKeyId(apiKeyId: string): Promise<ArcaConfig | null> {
    return prisma.arcaConfig.findFirst({ where: { apiKeyId } });
  }

  async create(data: ArcaConfigInput): Promise<ArcaConfig> {
    return prisma.arcaConfig.create({ data });
  }

  async update(id: string, data: Partial<ArcaConfigInput>): Promise<ArcaConfig> {
    return prisma.arcaConfig.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.arcaConfig.delete({ where: { id } });
  }

  async assignApiKey(configId: string, apiKeyId: string): Promise<void> {
    await prisma.arcaConfig.update({ where: { id: configId }, data: { apiKeyId } });
  }

  async unassignApiKey(apiKeyId: string): Promise<void> {
    await prisma.arcaConfig.updateMany({ where: { apiKeyId }, data: { apiKeyId: null } });
  }
}
