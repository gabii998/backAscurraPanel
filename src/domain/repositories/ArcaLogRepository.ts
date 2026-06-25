import type { ArcaLog } from "../entities/ArcaLog";

export interface ArcaLogRepository {
  create(log: Omit<ArcaLog, "id" | "updatedAt" | "createdAt">): Promise<ArcaLog>;
  list(configId: string, limit?: number): Promise<ArcaLog[]>;
}
