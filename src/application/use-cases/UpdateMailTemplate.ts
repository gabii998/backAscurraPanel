import type { MailTemplateRepository } from "../../domain/repositories/MailTemplateRepository";
import type { MailTemplate } from "../../domain/entities/MailTemplate";

export class UpdateMailTemplate {
  constructor(private repo: MailTemplateRepository) {}

  async execute(id: string, data: Partial<Pick<MailTemplate, "name" | "subject" | "html" | "params">>): Promise<MailTemplate> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("TEMPLATE_NOT_FOUND");
    return this.repo.update(id, data);
  }
}
