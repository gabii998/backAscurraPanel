import type { PortfolioProjectRepository } from "../../domain/repositories/PortfolioProjectRepository";
import type { R2Storage } from "../../infrastructure/services/R2Storage";

export class DeletePortfolioProject {
  constructor(
    private readonly repository: PortfolioProjectRepository,
    private readonly storage: R2Storage
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("PORTFOLIO_PROJECT_NOT_FOUND");
    if (existing.objectKey) await this.storage.delete(existing.objectKey).catch(() => {});
    await this.repository.delete(id);
  }
}
