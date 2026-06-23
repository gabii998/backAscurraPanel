import type { ErrorConfigDetail } from "../../domain/entities/ErrorConfig";
import type { ErrorConfigRepository } from "../../domain/repositories/ErrorConfigRepository";

export class ListErrorConfigs {
  constructor(private readonly repo: ErrorConfigRepository) {}

  async execute(): Promise<ErrorConfigDetail[]> {
    return this.repo.list();
  }
}
