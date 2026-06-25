import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";

export class DeleteArcaConfig {
  constructor(private configRepo: ArcaConfigRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.configRepo.getById(id);
    if (!existing) throw new Error("ARCA_CONFIG_NOT_FOUND");
    await this.configRepo.delete(id);
  }
}
