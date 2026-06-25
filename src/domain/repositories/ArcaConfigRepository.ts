import type { ArcaConfig, ArcaConfigInput } from "../entities/ArcaConfig";

export interface ArcaConfigRepository {
  list(): Promise<ArcaConfig[]>;
  getById(id: string): Promise<ArcaConfig | null>;
  getByApiKeyId(apiKeyId: string): Promise<ArcaConfig | null>;
  create(data: ArcaConfigInput): Promise<ArcaConfig>;
  update(id: string, data: Partial<ArcaConfigInput>): Promise<ArcaConfig>;
  delete(id: string): Promise<void>;
  assignApiKey(configId: string, apiKeyId: string): Promise<void>;
  unassignApiKey(apiKeyId: string): Promise<void>;
}
