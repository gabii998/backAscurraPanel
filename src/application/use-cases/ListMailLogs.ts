import type { MailLogRepository } from "../../domain/repositories/MailLogRepository";
import type { MailLog } from "../../domain/entities/MailLog";

export class ListMailLogs {
  constructor(private repo: MailLogRepository) {}

  async execute(configId: string, limit = 50): Promise<MailLog[]> {
    return this.repo.list(configId, limit);
  }
}
