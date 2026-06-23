import type { AppErrorRepository } from "../../domain/repositories/AppErrorRepository";
import type { AppError } from "../../domain/entities/AppError";

export class GetError {
  constructor(private readonly repository: AppErrorRepository) {}

  async execute(id: string): Promise<AppError> {
    const error = await this.repository.findById(id);
    if (!error) throw new Error("ERROR_NOT_FOUND");
    return error;
  }
}
