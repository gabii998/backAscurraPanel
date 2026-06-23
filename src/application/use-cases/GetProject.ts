import type { ProjectRepository } from "../../domain/repositories/ProjectRepository";
import type { Project } from "../../domain/entities/Project";

export class GetProject {
  constructor(private readonly repository: ProjectRepository) {}

  async execute(id: string): Promise<Project> {
    const project = await this.repository.findById(id);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    return project;
  }
}
