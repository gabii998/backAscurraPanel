import type { WhatsAppLog } from "../entities/WhatsAppLog";

export interface WhatsAppLogRepository {
  create(log: Omit<WhatsAppLog, "id" | "createdAt">): Promise<WhatsAppLog>;
  list(configId: string, limit?: number): Promise<WhatsAppLog[]>;
}
