import type { WhatsAppConfigRepository } from "../../domain/repositories/WhatsAppConfigRepository";

export class AssignApiKeyToWhatsAppConfig {
  constructor(private repo: WhatsAppConfigRepository) {}

  async execute(configId: string, apiKeyId: string): Promise<void> {
    const existing = await this.repo.getById(configId);
    if (!existing) throw new Error("CONFIG_NOT_FOUND");
    await this.repo.assignApiKey(configId, apiKeyId);
  }
}
