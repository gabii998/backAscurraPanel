import type { AppErrorRepository } from "../../domain/repositories/AppErrorRepository";

export class DeleteError {
  constructor(private readonly repository: AppErrorRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) throw new Error("ERROR_NOT_FOUND");
  }
}
