import type { ErrorIngestData } from "../model/ErrorIngestData";

export interface PendingSynchronization extends ErrorIngestData {
  id: string;
  clientItemId: string;
  apiKeyId: string;
  receivedAt: Date;
}
