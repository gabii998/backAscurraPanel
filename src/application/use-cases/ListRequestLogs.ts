import type { RequestLogRepository } from "../../domain/repositories/RequestLogRepository";
import type { RequestLog } from "../../domain/entities/RequestLog";

export interface RequestLogsPage {
  data: RequestLog[];
  total: number;
  page: number;
  limit: number;
}

export class ListRequestLogs {
  constructor(private logRepo: RequestLogRepository) {}

  async execute(page = 1, limit = 50): Promise<RequestLogsPage> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.logRepo.list(skip, limit),
      this.logRepo.count(),
    ]);
    return { data, total, page, limit };
  }
}
