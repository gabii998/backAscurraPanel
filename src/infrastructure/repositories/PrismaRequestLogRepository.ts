import { prisma } from "../db/prisma";
import type { RequestLogRepository, RequestLogFilters } from "../../domain/repositories/RequestLogRepository";
import type { RequestLog } from "../../domain/entities/RequestLog";

export class PrismaRequestLogRepository implements RequestLogRepository {
  async create(log: Omit<RequestLog, "id" | "createdAt">): Promise<void> {
    await prisma.requestLog.create({ data: log });
  }

  async list(skip = 0, limit = 50, filters?: RequestLogFilters): Promise<RequestLog[]> {
    return prisma.requestLog.findMany({
      where: filters?.pathPrefix ? { path: { startsWith: filters.pathPrefix } } : undefined,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
  }

  async count(filters?: RequestLogFilters): Promise<number> {
    return prisma.requestLog.count({
      where: filters?.pathPrefix ? { path: { startsWith: filters.pathPrefix } } : undefined,
    });
  }
}
