import type { PendingSynchronization } from "../entities/PendingSynchronization";

export interface PendingSynchronizationRepository {
  /** Returns false when the same client item was already acknowledged. */
  create(item: PendingSynchronization): Promise<boolean>;
  list(): Promise<PendingSynchronization[]>;
}
