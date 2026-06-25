import { prisma } from "../db/prisma";
import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";
import type { ArcaLog } from "../../domain/entities/ArcaLog";

export class PrismaArcaLogRepository implements ArcaLogRepository {
  async create(log: Omit<ArcaLog, "id" | "updatedAt" | "createdAt">): Promise<ArcaLog> {
    return prisma.arcaLog.create({ data: log });
  }

  async list(configId: string, limit = 50): Promise<ArcaLog[]> {
    return prisma.arcaLog.findMany({
      where: { configId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
