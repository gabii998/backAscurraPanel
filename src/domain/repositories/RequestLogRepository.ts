import type { RequestLog } from "../entities/RequestLog";

export interface RequestLogFilters {
  pathPrefix?: string;
}

export interface RequestLogRepository {
  create(log: Omit<RequestLog, "id" | "createdAt">): Promise<void>;
  list(skip?: number, limit?: number, filters?: RequestLogFilters): Promise<RequestLog[]>;
  count(filters?: RequestLogFilters): Promise<number>;
}
