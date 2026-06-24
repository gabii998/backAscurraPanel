import { prisma } from "../db/prisma";
import type { MailConfigRepository, MailConfigInput } from "../../domain/repositories/MailConfigRepository";
import type { MailConfig } from "../../domain/entities/MailConfig";

export class PrismaMailConfigRepository implements MailConfigRepository {
  async list(): Promise<MailConfig[]> {
    return prisma.mailConfig.findMany({ orderBy: { createdAt: "asc" } });
  }

  async getById(id: string): Promise<MailConfig | null> {
    return prisma.mailConfig.findUnique({ where: { id } });
  }

  async getByName(name: string): Promise<MailConfig | null> {
    return prisma.mailConfig.findUnique({ where: { name } });
  }

  async create(data: MailConfigInput): Promise<MailConfig> {
    return prisma.mailConfig.create({ data });
  }

  async update(id: string, data: Partial<MailConfigInput>): Promise<MailConfig> {
    return prisma.mailConfig.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.mailConfig.delete({ where: { id } });
  }
}
