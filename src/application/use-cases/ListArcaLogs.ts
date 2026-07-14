import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";
import type { ArcaLog } from "../../domain/entities/ArcaLog";

export interface ArcaLogsPage {
  data: ArcaLog[];
  total: number;
  page: number;
  limit: number;
}

export class ListArcaLogs {
  constructor(private logRepo: ArcaLogRepository) {}

  async execute(configId: string, page = 1, limit = 50): Promise<ArcaLogsPage> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.logRepo.list(configId, skip, limit),
      this.logRepo.count(configId),
    ]);
    return { data, total, page, limit };
  }
}
