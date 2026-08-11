import type { ArcaLog } from "../entities/ArcaLog";

export interface ArcaLogRepository {
  create(log: Omit<ArcaLog, "id" | "updatedAt" | "createdAt">): Promise<ArcaLog>;
  list(configId: string, skip?: number, limit?: number): Promise<ArcaLog[]>;
  count(configId: string): Promise<number>;
  findByIdempotencyKey(configId: string, emisorCuit: string, key: string): Promise<ArcaLog | null>;
  update(id: string, data: Pick<ArcaLog, "response" | "status" | "error" | "durationMs">): Promise<ArcaLog>;
}
