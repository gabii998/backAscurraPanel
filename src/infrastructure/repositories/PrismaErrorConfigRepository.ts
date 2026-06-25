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

    return Promise.all(
      records.map(async (r) => {
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
      })
    );
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

  async delete(id: string): Promise<void> {
    await prisma.errorConfig.delete({ where: { id } });
  }
}
