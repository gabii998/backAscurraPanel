import { prisma } from "../db/prisma";
import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoConfig, MercadoPagoConfigInput } from "../../domain/entities/MercadoPagoConfig";

export class PrismaMercadoPagoConfigRepository implements MercadoPagoConfigRepository {
  async list(): Promise<MercadoPagoConfig[]> {
    return prisma.mercadoPagoConfig.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getById(id: string): Promise<MercadoPagoConfig | null> {
    return prisma.mercadoPagoConfig.findUnique({ where: { id } });
  }

  async getByName(name: string): Promise<MercadoPagoConfig | null> {
    return prisma.mercadoPagoConfig.findUnique({ where: { name } });
  }

  async getByApiKeyId(apiKeyId: string): Promise<MercadoPagoConfig | null> {
    return prisma.mercadoPagoConfig.findFirst({ where: { apiKeyId } });
  }

  async create(data: MercadoPagoConfigInput): Promise<MercadoPagoConfig> {
    return prisma.mercadoPagoConfig.create({ data });
  }

  async update(id: string, data: Partial<MercadoPagoConfigInput>): Promise<MercadoPagoConfig> {
    return prisma.mercadoPagoConfig.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.mercadoPagoConfig.delete({ where: { id } });
  }
}
