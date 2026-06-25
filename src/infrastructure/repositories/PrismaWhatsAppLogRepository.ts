import { prisma } from "../db/prisma";
import type { WhatsAppLogRepository } from "../../domain/repositories/WhatsAppLogRepository";
import type { WhatsAppLog } from "../../domain/entities/WhatsAppLog";

export class PrismaWhatsAppLogRepository implements WhatsAppLogRepository {
  async create(log: Omit<WhatsAppLog, "id" | "createdAt">): Promise<WhatsAppLog> {
    return prisma.whatsAppLog.create({ data: log });
  }

  async list(configId: string, limit = 50): Promise<WhatsAppLog[]> {
    return prisma.whatsAppLog.findMany({
      where: { configId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
