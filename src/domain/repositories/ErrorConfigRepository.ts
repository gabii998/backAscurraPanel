import type { ErrorConfig, ErrorConfigDetail } from "../entities/ErrorConfig";

export interface ErrorConfigRepository {
  create(config: ErrorConfig): Promise<ErrorConfig>;
  list(): Promise<ErrorConfigDetail[]>;
  getById(id: string): Promise<ErrorConfigDetail | null>;
  findByApiKeyId(apiKeyId: string): Promise<ErrorConfig[]>;
  delete(id: string): Promise<void>;
}
