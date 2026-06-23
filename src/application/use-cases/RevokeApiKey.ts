import type { ApiKeyRepository } from "../../domain/repositories/ApiKeyRepository";

export class RevokeApiKey {
  constructor(private readonly repository: ApiKeyRepository) {}

  async execute(id: string): Promise<void> {
    const ok = await this.repository.revoke(id);
    if (!ok) throw new Error("API_KEY_NOT_FOUND");
  }
}
