import type { MailTemplateRepository } from "../../domain/repositories/MailTemplateRepository";
import type { MailTemplate } from "../../domain/entities/MailTemplate";

export interface CreateMailTemplateInput {
  configId: string;
  name: string;
  subject: string;
  html: string;
  params: string[];
}

export class CreateMailTemplate {
  constructor(private repo: MailTemplateRepository) {}

  async execute(input: CreateMailTemplateInput): Promise<MailTemplate> {
    if (!input.configId || !input.name || !input.subject || !input.html) throw new Error("MISSING_FIELDS");
    return this.repo.create({ configId: input.configId, name: input.name, subject: input.subject, html: input.html, params: input.params });
  }
}
