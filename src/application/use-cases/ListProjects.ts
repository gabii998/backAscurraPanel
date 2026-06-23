import type { ProjectRepository, ListProjectsFilter } from "../../domain/repositories/ProjectRepository";
import type { Project } from "../../domain/entities/Project";

export class ListProjects {
  constructor(private readonly repository: ProjectRepository) {}

  async execute(filter: ListProjectsFilter): Promise<Project[]> {
    return this.repository.list(filter);
  }
}
