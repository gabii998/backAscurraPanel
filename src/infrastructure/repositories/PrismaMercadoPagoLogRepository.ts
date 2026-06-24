import { prisma } from "../db/prisma";
import type { MercadoPagoLogRepository } from "../../domain/repositories/MercadoPagoLogRepository";
import type { MercadoPagoLog } from "../../domain/entities/MercadoPagoLog";

export class PrismaMercadoPagoLogRepository implements MercadoPagoLogRepository {
  async create(log: Omit<MercadoPagoLog, "id" | "updatedAt" | "createdAt">): Promise<MercadoPagoLog> {
    return prisma.mercadoPagoLog.create({ data: log });
  }

  async list(configId: string, limit = 50): Promise<MercadoPagoLog[]> {
    return prisma.mercadoPagoLog.findMany({
      where: { configId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getByExternalReference(externalReference: string, configId: string): Promise<MercadoPagoLog | null> {
    return prisma.mercadoPagoLog.findFirst({
      where: { externalReference, configId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(id: string, status: string, paymentId: string, amount: number): Promise<void> {
    await prisma.mercadoPagoLog.update({
      where: { id },
      data: { status, paymentId, amount },
    });
  }
}
