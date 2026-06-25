import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";

export class AssignApiKeyToArcaConfig {
  constructor(private configRepo: ArcaConfigRepository) {}

  async execute(configId: string, apiKeyId: string): Promise<void> {
    const existing = await this.configRepo.getById(configId);
    if (!existing) throw new Error("ARCA_CONFIG_NOT_FOUND");
    await this.configRepo.assignApiKey(configId, apiKeyId);
  }
}
