import type { PortfolioProjectRepository } from "../../domain/repositories/PortfolioProjectRepository";

export class ReorderPortfolioProjects {
  constructor(private readonly repository: PortfolioProjectRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) throw new Error("MISSING_FIELDS");
    await this.repository.reorder(orderedIds);
  }
}
