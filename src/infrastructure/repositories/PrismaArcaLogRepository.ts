import { prisma } from "../db/prisma";
import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";
import type { ArcaLog } from "../../domain/entities/ArcaLog";

export class PrismaArcaLogRepository implements ArcaLogRepository {
  async create(log: Omit<ArcaLog, "id" | "updatedAt" | "createdAt">): Promise<ArcaLog> {
    return prisma.arcaLog.create({ data: log });
  }

  async list(configId: string, skip = 0, limit = 50): Promise<ArcaLog[]> {
    return prisma.arcaLog.findMany({
      where: { configId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
  }

  async count(configId: string): Promise<number> {
    return prisma.arcaLog.count({ where: { configId } });
  }

  async findByIdempotencyKey(configId: string, emisorCuit: string, key: string): Promise<ArcaLog | null> {
    return prisma.arcaLog.findUnique({ where: { configId_emisorCuit_idempotencyKey: { configId, emisorCuit, idempotencyKey: key } } });
  }

  async update(id: string, data: Pick<ArcaLog, "response" | "status" | "error" | "durationMs">): Promise<ArcaLog> {
    return prisma.arcaLog.update({ where: { id }, data });
  }
}
