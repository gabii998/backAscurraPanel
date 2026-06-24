import { prisma } from "../db/prisma";
import type { MailLogRepository } from "../../domain/repositories/MailLogRepository";
import type { MailLog } from "../../domain/entities/MailLog";

export class PrismaMailLogRepository implements MailLogRepository {
  async create(log: Omit<MailLog, "id" | "createdAt">): Promise<MailLog> {
    return prisma.mailLog.create({ data: log });
  }

  async list(configId: string, limit = 50): Promise<MailLog[]> {
    return prisma.mailLog.findMany({ where: { configId }, orderBy: { createdAt: "desc" }, take: limit });
  }
}
