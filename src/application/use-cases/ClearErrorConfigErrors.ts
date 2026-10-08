import type { ErrorConfigRepository } from "../../domain/repositories/ErrorConfigRepository";
import type { AppErrorRepository } from "../../domain/repositories/AppErrorRepository";

export class ClearErrorConfigErrors {
  constructor(private readonly configs: ErrorConfigRepository, private readonly errors: AppErrorRepository) {}

  async execute(id: string): Promise<number> {
    if (!await this.configs.getById(id)) throw new Error("ERROR_CONFIG_NOT_FOUND");
    return this.errors.softDeleteByConfig(id);
  }
}
