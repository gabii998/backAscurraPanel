import type { RequestLog } from "../entities/RequestLog";

export interface RequestLogRepository {
  create(log: Omit<RequestLog, "id" | "createdAt">): Promise<void>;
  list(skip?: number, limit?: number): Promise<RequestLog[]>;
  count(): Promise<number>;
}
