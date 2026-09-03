import type { PortfolioProjectRepository } from "../../domain/repositories/PortfolioProjectRepository";
import type { PortfolioProject } from "../../domain/entities/PortfolioProject";

export class ListPortfolioProjects {
  constructor(private readonly repository: PortfolioProjectRepository) {}

  async execute(): Promise<PortfolioProject[]> {
    return this.repository.list();
  }
}
