import type { MailLog } from "../entities/MailLog";

export interface MailLogRepository {
  create(log: Omit<MailLog, "id" | "createdAt">): Promise<MailLog>;
  list(configId: string, limit?: number): Promise<MailLog[]>;
}
