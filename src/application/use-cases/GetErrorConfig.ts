import type { ErrorConfigDetail } from "../../domain/entities/ErrorConfig";
import type { ErrorConfigRepository } from "../../domain/repositories/ErrorConfigRepository";

export class GetErrorConfig {
  constructor(private readonly repo: ErrorConfigRepository) {}

  async execute(id: string): Promise<ErrorConfigDetail | null> {
    return this.repo.getById(id);
  }
}
