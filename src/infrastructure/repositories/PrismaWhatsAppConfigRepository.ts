import { prisma } from "../db/prisma";
import type { WhatsAppConfigRepository } from "../../domain/repositories/WhatsAppConfigRepository";
import type { WhatsAppConfig, WhatsAppConfigInput } from "../../domain/entities/WhatsAppConfig";

export class PrismaWhatsAppConfigRepository implements WhatsAppConfigRepository {
  async list(): Promise<WhatsAppConfig[]> {
    return prisma.whatsAppConfig.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getById(id: string): Promise<WhatsAppConfig | null> {
    return prisma.whatsAppConfig.findUnique({ where: { id } });
  }

  async getByName(name: string): Promise<WhatsAppConfig | null> {
    return prisma.whatsAppConfig.findUnique({ where: { name } });
  }

  async getByApiKeyId(apiKeyId: string): Promise<WhatsAppConfig | null> {
    return prisma.whatsAppConfig.findFirst({ where: { apiKeyId } });
  }

  async create(data: WhatsAppConfigInput): Promise<WhatsAppConfig> {
    return prisma.whatsAppConfig.create({ data });
  }

  async update(id: string, data: Partial<WhatsAppConfigInput>): Promise<WhatsAppConfig> {
    return prisma.whatsAppConfig.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.whatsAppConfig.delete({ where: { id } });
  }

  async assignApiKey(configId: string, apiKeyId: string): Promise<void> {
    await prisma.whatsAppConfig.update({ where: { id: configId }, data: { apiKeyId } });
  }

  async unassignApiKey(apiKeyId: string): Promise<void> {
    await prisma.whatsAppConfig.updateMany({ where: { apiKeyId }, data: { apiKeyId: null } });
  }
}
