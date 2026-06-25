import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";
import type { ArcaLog } from "../../domain/entities/ArcaLog";

export class ListArcaLogs {
  constructor(private logRepo: ArcaLogRepository) {}

  async execute(configId: string, limit?: number): Promise<ArcaLog[]> {
    return this.logRepo.list(configId, limit ?? 50);
  }
}
