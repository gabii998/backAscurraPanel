import { randomBytes, createHash, randomUUID } from "crypto";
import type { ApiKeyRepository } from "../../domain/repositories/ApiKeyRepository";
import type { ApiKey } from "../../domain/entities/ApiKey";

export class CreateApiKey {
  constructor(private readonly repository: ApiKeyRepository) {}

  async execute(name: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = `aks_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 8);

    const entity: ApiKey = {
      id: randomUUID(),
      name,
      keyHash,
      prefix,
      createdAt: new Date(),
      revokedAt: null,
    };

    const apiKey = await this.repository.create(entity);
    return { apiKey, rawKey };
  }
}
