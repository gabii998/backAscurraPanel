import type { MailTemplateRepository } from "../../domain/repositories/MailTemplateRepository";

export class DeleteMailTemplate {
  constructor(private repo: MailTemplateRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("TEMPLATE_NOT_FOUND");
    await this.repo.delete(id);
  }
}
