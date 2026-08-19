import { randomUUID } from "crypto";
import type { ErrorConfig } from "../../domain/entities/ErrorConfig";
import type { ErrorConfigRepository } from "../../domain/repositories/ErrorConfigRepository";

export class CreateErrorConfig {
  constructor(private readonly repo: ErrorConfigRepository) {}

  async execute(data: { name: string; apiKeyId?: string }): Promise<ErrorConfig> {
    if (data.apiKeyId) {
      const assignedConfigs = await this.repo.findByApiKeyId(data.apiKeyId);
      if (assignedConfigs.length > 0) throw new Error("API_KEY_ALREADY_ASSIGNED");
    }

    const config: ErrorConfig = {
      id:        randomUUID(),
      name:      data.name,
      apiKeyId:  data.apiKeyId ?? null,
      createdAt: new Date(),
    };
    return this.repo.create(config);
  }
}
