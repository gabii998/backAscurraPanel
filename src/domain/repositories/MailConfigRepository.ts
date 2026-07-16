import type { MailConfig, MailConfigInput } from "../entities/MailConfig";

export interface MailConfigRepository {
  list(): Promise<MailConfig[]>;
  getById(id: string): Promise<MailConfig | null>;
  getByName(name: string): Promise<MailConfig | null>;
  getByNameAndApiKeyId(name: string, apiKeyId: string): Promise<MailConfig | null>;
  create(data: MailConfigInput): Promise<MailConfig>;
  update(id: string, data: Partial<MailConfigInput>): Promise<MailConfig>;
  delete(id: string): Promise<void>;
}
