import { randomUUID } from "crypto";
import type { ErrorIngestData } from "../../domain/model/ErrorIngestData";
import type { PendingSynchronizationRepository } from "../../domain/repositories/PendingSynchronizationRepository";
import type { IngestError } from "./IngestError";

export interface PendingErrorInput extends ErrorIngestData { clientItemId: string; }

export class SyncPendingErrors {
  constructor(
    private readonly repository: PendingSynchronizationRepository,
    private readonly ingestError: IngestError,
  ) {}

  async execute(apiKeyId: string, items: PendingErrorInput[]): Promise<string[]> {
    const acceptedIds: string[] = [];
    for (const item of items) {
      const stored = await this.repository.create({ ...item, id: randomUUID(), apiKeyId, receivedAt: new Date() });
      // Once persisted, the item has reached the backend and can be safely deleted locally.
      acceptedIds.push(item.clientItemId);
      if (stored) await this.ingestError.execute(item);
    }
    return acceptedIds;
  }
}
