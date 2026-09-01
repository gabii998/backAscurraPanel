import { prisma } from "../db/prisma";
import type { ErrorConfig, ErrorConfigDetail } from "../../domain/entities/ErrorConfig";
import type { ErrorConfigRepository } from "../../domain/repositories/ErrorConfigRepository";

export class PrismaErrorConfigRepository implements ErrorConfigRepository {
  async create(config: ErrorConfig): Promise<ErrorConfig> {
    const record = await prisma.errorConfig.create({
      data: {
        id:        config.id,
        name:      config.name,
        apiKeyId:  config.apiKeyId,
        createdAt: config.createdAt,
      },
    });
    return record;
  }

  async list(): Promise<ErrorConfigDetail[]> {
    const records = await prisma.errorConfig.findMany({
      include: { apiKey: { select: { prefix: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (records.length === 0) return [];

    const counts = await prisma.appError.groupBy({
      by: ["errorConfigId"],
      where: { deletedAt: null, errorConfigId: { in: records.map((r) => r.id) } },
      _count: { _all: true },
    });
    const countByConfigId = new Map(counts.map((c) => [c.errorConfigId, c._count._all]));

    return records.map((r) => ({
      id:           r.id,
      name:         r.name,
      apiKeyId:     r.apiKeyId,
      createdAt:    r.createdAt,
      apiKeyPrefix: r.apiKey?.prefix ?? null,
      errorCount:   countByConfigId.get(r.id) ?? 0,
    }));
  }

  async getById(id: string): Promise<ErrorConfigDetail | null> {
    const r = await prisma.errorConfig.findUnique({
      where: { id },
      include: { apiKey: { select: { prefix: true } } },
    });
    if (!r) return null;
    const errorCount = await prisma.appError.count({
      where: { errorConfigId: r.id, deletedAt: null },
    });
    return {
      id:           r.id,
      name:         r.name,
      apiKeyId:     r.apiKeyId,
      createdAt:    r.createdAt,
      apiKeyPrefix: r.apiKey?.prefix ?? null,
      errorCount,
    };
  }

  async findByApiKeyId(apiKeyId: string): Promise<ErrorConfig[]> {
    return prisma.errorConfig.findMany({
      where: { apiKeyId },
      orderBy: { createdAt: "asc" },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.errorConfig.delete({ where: { id } });
  }
}
