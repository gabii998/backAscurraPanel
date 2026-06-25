import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";

export class UnassignApiKeyFromArcaConfig {
  constructor(private configRepo: ArcaConfigRepository) {}

  async execute(apiKeyId: string): Promise<void> {
    await this.configRepo.unassignApiKey(apiKeyId);
  }
}
