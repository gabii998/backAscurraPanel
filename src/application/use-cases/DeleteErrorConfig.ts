import type { ErrorConfigRepository } from "../../domain/repositories/ErrorConfigRepository";

export class DeleteErrorConfig {
  constructor(private readonly repo: ErrorConfigRepository) {}

  async execute(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
