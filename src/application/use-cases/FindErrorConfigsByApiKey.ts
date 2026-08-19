import type { ErrorConfig } from "../../domain/entities/ErrorConfig";
import type { ErrorConfigRepository } from "../../domain/repositories/ErrorConfigRepository";

export class FindErrorConfigsByApiKey {
  constructor(private readonly repository: ErrorConfigRepository) {}

  async execute(apiKeyId: string): Promise<ErrorConfig[]> {
    return this.repository.findByApiKeyId(apiKeyId);
  }
}
