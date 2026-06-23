import type { AppErrorRepository } from "../../domain/repositories/AppErrorRepository";
import type { ErrorStatus, AppError } from "../../domain/entities/AppError";

export class UpdateErrorStatus {
  constructor(private readonly repository: AppErrorRepository) {}

  async execute(id: string, status: ErrorStatus): Promise<AppError> {
    const updated = await this.repository.updateStatus(id, status);
    if (!updated) throw new Error("ERROR_NOT_FOUND");
    return updated;
  }
}
