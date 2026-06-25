import type { WhatsAppConfig, WhatsAppConfigInput } from "../entities/WhatsAppConfig";

export interface WhatsAppConfigRepository {
  list(): Promise<WhatsAppConfig[]>;
  getById(id: string): Promise<WhatsAppConfig | null>;
  getByName(name: string): Promise<WhatsAppConfig | null>;
  getByApiKeyId(apiKeyId: string): Promise<WhatsAppConfig | null>;
  create(data: WhatsAppConfigInput): Promise<WhatsAppConfig>;
  update(id: string, data: Partial<WhatsAppConfigInput>): Promise<WhatsAppConfig>;
  delete(id: string): Promise<void>;
  assignApiKey(configId: string, apiKeyId: string): Promise<void>;
  unassignApiKey(apiKeyId: string): Promise<void>;
}
