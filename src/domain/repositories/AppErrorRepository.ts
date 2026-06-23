import type { AppError, ErrorStatus, OccurrenceData } from "../entities/AppError";
import type { ErrorSeverity } from "../entities/AppError";

export interface ListErrorsFilter {
  severity?: ErrorSeverity;
  status?: ErrorStatus;
  projectId?: string;
  query?: string;
}

export interface AppErrorRepository {
  findByFingerprint(projectId: string | null, type: string, message: string): Promise<AppError | null>;
  findById(id: string): Promise<AppError | null>;
  list(filter: ListErrorsFilter): Promise<AppError[]>;
  create(error: AppError): Promise<AppError>;
  addOccurrence(errorId: string, data: OccurrenceData): Promise<void>;
  updateCounts(id: string, data: { count: number; usersAffected: number; lastSeen: Date }): Promise<void>;
  updateStatus(id: string, status: ErrorStatus): Promise<AppError | null>;
  softDelete(id: string): Promise<boolean>;
  getSparkline(errorId: string): Promise<number[]>;
  isUserKnown(errorId: string, userId: string): Promise<boolean>;
}
