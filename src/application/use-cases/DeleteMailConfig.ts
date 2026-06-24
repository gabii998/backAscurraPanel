import type { MailConfigRepository } from "../../domain/repositories/MailConfigRepository";

export class DeleteMailConfig {
  constructor(private repo: MailConfigRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("CONFIG_NOT_FOUND");
    await this.repo.delete(id);
  }
}
