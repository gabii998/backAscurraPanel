import type { MailTemplate } from "../entities/MailTemplate";

export interface MailTemplateRepository {
  list(configId: string): Promise<MailTemplate[]>;
  getById(id: string): Promise<MailTemplate | null>;
  getByName(name: string, configId: string): Promise<MailTemplate | null>;
  create(data: Omit<MailTemplate, "id" | "updatedAt" | "createdAt">): Promise<MailTemplate>;
  update(id: string, data: Partial<Omit<MailTemplate, "id" | "updatedAt" | "createdAt">>): Promise<MailTemplate>;
  delete(id: string): Promise<void>;
}
