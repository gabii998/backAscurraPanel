import type { ErrorSeverity } from "../entities/AppError";

export interface ErrorIngestData {
  type: string;
  message: string;
  severity?: ErrorSeverity;
  stackTrace?: string;
  errorConfigId?: string;
  meta?: {
    url?: string;
    browser?: string;
    os?: string;
    user?: string;
  };
}
