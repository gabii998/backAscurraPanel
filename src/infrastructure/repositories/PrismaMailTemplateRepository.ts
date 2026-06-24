import { prisma } from "../db/prisma";
import type { MailTemplateRepository } from "../../domain/repositories/MailTemplateRepository";
import type { MailTemplate } from "../../domain/entities/MailTemplate";

export class PrismaMailTemplateRepository implements MailTemplateRepository {
  async list(configId: string): Promise<MailTemplate[]> {
    return prisma.mailTemplate.findMany({ where: { configId }, orderBy: { createdAt: "desc" } });
  }

  async getById(id: string): Promise<MailTemplate | null> {
    return prisma.mailTemplate.findUnique({ where: { id } });
  }

  async getByName(name: string, configId: string): Promise<MailTemplate | null> {
    return prisma.mailTemplate.findUnique({ where: { configId_name: { configId, name } } });
  }

  async create(data: Omit<MailTemplate, "id" | "updatedAt" | "createdAt">): Promise<MailTemplate> {
    return prisma.mailTemplate.create({ data });
  }

  async update(id: string, data: Partial<Omit<MailTemplate, "id" | "updatedAt" | "createdAt">>): Promise<MailTemplate> {
    return prisma.mailTemplate.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.mailTemplate.delete({ where: { id } });
  }
}
