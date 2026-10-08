import type { PendingSynchronizationRepository } from "../../domain/repositories/PendingSynchronizationRepository";
import type { PendingSynchronization } from "../../domain/entities/PendingSynchronization";

export class ListPendingSynchronizations {
  constructor(private readonly repository: PendingSynchronizationRepository) {}
  execute(): Promise<PendingSynchronization[]> { return this.repository.list(); }
}
