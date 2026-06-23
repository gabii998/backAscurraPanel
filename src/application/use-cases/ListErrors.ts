import type { AppErrorRepository, ListErrorsFilter } from "../../domain/repositories/AppErrorRepository";
import type { AppError } from "../../domain/entities/AppError";

export class ListErrors {
  constructor(private readonly repository: AppErrorRepository) {}

  async execute(filter: ListErrorsFilter): Promise<AppError[]> {
    return this.repository.list(filter);
  }
}
