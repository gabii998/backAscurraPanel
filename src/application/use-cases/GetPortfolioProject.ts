import type { PortfolioProjectRepository } from "../../domain/repositories/PortfolioProjectRepository";
import type { PortfolioProject } from "../../domain/entities/PortfolioProject";

export class GetPortfolioProject {
  constructor(private readonly repository: PortfolioProjectRepository) {}

  async execute(id: string): Promise<PortfolioProject> {
    const project = await this.repository.findById(id);
    if (!project) throw new Error("PORTFOLIO_PROJECT_NOT_FOUND");
    return project;
  }
}
