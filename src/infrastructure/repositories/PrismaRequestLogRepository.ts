import { prisma } from "../db/prisma";
import type { RequestLogRepository } from "../../domain/repositories/RequestLogRepository";
import type { RequestLog } from "../../domain/entities/RequestLog";

export class PrismaRequestLogRepository implements RequestLogRepository {
  async create(log: Omit<RequestLog, "id" | "createdAt">): Promise<void> {
    await prisma.requestLog.create({ data: log });
  }

  async list(skip = 0, limit = 50): Promise<RequestLog[]> {
    return prisma.requestLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
  }

  async count(): Promise<number> {
    return prisma.requestLog.count();
  }
}
