export type ErrorSeverity = "critical" | "error" | "warning";
export type ErrorStatus   = "unresolved" | "resolved" | "ignored";

export interface AppError {
  id: string;
  errorConfigId: string | null;
  type: string;
  message: string;
  severity: ErrorSeverity;
  status: ErrorStatus;
  count: number;
  usersAffected: number;
  stackTrace: string;
  firstSeen: Date;
  lastSeen: Date;
  metaUrl: string;
  metaBrowser: string;
  metaOs: string;
  metaUser: string;
  sparkline: number[];
  createdAt: Date;
  deletedAt: Date | null;
}

export interface OccurrenceData {
  userId: string | null;
  url: string;
  browser: string;
  os: string;
}
