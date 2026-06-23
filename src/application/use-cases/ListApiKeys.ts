import type { ApiKeyRepository } from "../../domain/repositories/ApiKeyRepository";
import type { ApiKey } from "../../domain/entities/ApiKey";

export class ListApiKeys {
  constructor(private readonly repository: ApiKeyRepository) {}

  async execute(): Promise<ApiKey[]> {
    return this.repository.list();
  }
}
