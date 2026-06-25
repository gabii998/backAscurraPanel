import type { WhatsAppConfigRepository } from "../../domain/repositories/WhatsAppConfigRepository";

export class DeleteWhatsAppConfig {
  constructor(private repo: WhatsAppConfigRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("CONFIG_NOT_FOUND");
    await this.repo.delete(id);
  }
}
