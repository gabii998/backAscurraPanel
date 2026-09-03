import type { PortfolioProject } from "../entities/PortfolioProject";

export interface PortfolioProjectRepository {
  findById(id: string): Promise<PortfolioProject | null>;
  list(): Promise<PortfolioProject[]>;
  count(): Promise<number>;
  create(project: PortfolioProject): Promise<PortfolioProject>;
  update(
    id: string,
    data: Partial<Omit<PortfolioProject, "id" | "createdAt">>
  ): Promise<PortfolioProject | null>;
  delete(id: string): Promise<boolean>;
  reorder(orderedIds: string[]): Promise<void>;
}
