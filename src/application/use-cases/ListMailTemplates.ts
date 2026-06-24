import type { MailTemplateRepository } from "../../domain/repositories/MailTemplateRepository";
import type { MailTemplate } from "../../domain/entities/MailTemplate";

export class ListMailTemplates {
  constructor(private repo: MailTemplateRepository) {}

  async execute(configId: string): Promise<MailTemplate[]> {
    return this.repo.list(configId);
  }
}
