import type { RequestLogRepository } from "../../domain/repositories/RequestLogRepository";

export class ClearRequestLogs {
  constructor(private readonly repository: RequestLogRepository) {}

  execute(): Promise<number> {
    return this.repository.clear();
  }
}
