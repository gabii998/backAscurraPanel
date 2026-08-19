import { randomUUID } from "crypto";
import type { AppErrorRepository } from "../../domain/repositories/AppErrorRepository";
import type { ErrorIngestData } from "../../domain/model/ErrorIngestData";
import type { AppError } from "../../domain/entities/AppError";

interface ErrorNotificationDispatcher {
  newError(error: AppError): Promise<void>;
}

export class IngestError {
  constructor(
    private readonly repository: AppErrorRepository,
    private readonly notificationDispatcher?: ErrorNotificationDispatcher,
  ) {}

  async execute(data: ErrorIngestData): Promise<AppError> {
    const errorConfigId = data.errorConfigId ?? null;
    const userId        = data.meta?.user ?? null;
    const now           = new Date();

    const occurrence = {
      userId,
      url:     data.meta?.url     ?? "",
      browser: data.meta?.browser ?? "",
      os:      data.meta?.os      ?? "",
    };

    const existing = await this.repository.findByFingerprint(errorConfigId, data.type, data.message);

    if (existing) {
      const isKnownUser = userId ? await this.repository.isUserKnown(existing.id, userId) : true;
      await this.repository.addOccurrence(existing.id, occurrence);
      await this.repository.updateCounts(existing.id, {
        count:         existing.count + 1,
        usersAffected: isKnownUser ? existing.usersAffected : existing.usersAffected + 1,
        lastSeen:      now,
      });
      const updated = await this.repository.findById(existing.id);
      return updated!;
    }

    const error: AppError = {
      id:            randomUUID(),
      errorConfigId,
      type:          data.type,
      message:       data.message,
      severity:      data.severity ?? "error",
      status:        "unresolved",
      count:         1,
      usersAffected: userId ? 1 : 0,
      stackTrace:    data.stackTrace ?? "",
      firstSeen:     now,
      lastSeen:      now,
      metaUrl:       data.meta?.url     ?? "",
      metaBrowser:   data.meta?.browser ?? "",
      metaOs:        data.meta?.os      ?? "",
      metaUser:      data.meta?.user    ?? "",
      sparkline:     [0, 0, 0, 0, 0, 0, 1],
      createdAt:     now,
      deletedAt:     null,
    };

    await this.repository.create(error);
    await this.repository.addOccurrence(error.id, occurrence);
    await this.notificationDispatcher?.newError(error);
    return error;
  }
}
