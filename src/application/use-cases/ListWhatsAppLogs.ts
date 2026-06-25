import type { WhatsAppLogRepository } from "../../domain/repositories/WhatsAppLogRepository";
import type { WhatsAppLog } from "../../domain/entities/WhatsAppLog";

export class ListWhatsAppLogs {
  constructor(private repo: WhatsAppLogRepository) {}

  async execute(configId: string, limit?: number): Promise<WhatsAppLog[]> {
    return this.repo.list(configId, limit);
  }
}
