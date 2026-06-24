import type { MailConfig } from "../entities/MailConfig";

export type MailConfigInput = Omit<MailConfig, "id" | "updatedAt" | "createdAt">;

export interface MailConfigRepository {
  list(): Promise<MailConfig[]>;
  getById(id: string): Promise<MailConfig | null>;
  getByName(name: string): Promise<MailConfig | null>;
  create(data: MailConfigInput): Promise<MailConfig>;
  update(id: string, data: Partial<MailConfigInput>): Promise<MailConfig>;
  delete(id: string): Promise<void>;
}
