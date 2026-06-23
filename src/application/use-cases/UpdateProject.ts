import type { ProjectRepository } from "../../domain/repositories/ProjectRepository";
import type { ProjectUpdateData } from "../../domain/model/ProjectCreateData";
import type { Project } from "../../domain/entities/Project";

export class UpdateProject {
  constructor(private readonly repository: ProjectRepository) {}

  async execute(id: string, data: ProjectUpdateData): Promise<Project> {
    const { memberIds, ...fields } = data;
    const updated = await this.repository.update(id, fields, memberIds);
    if (!updated) throw new Error("PROJECT_NOT_FOUND");
    return updated;
  }
}
