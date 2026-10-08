import { randomUUID } from "crypto";
import type { ProjectRepository } from "../../domain/repositories/ProjectRepository";
import type { ProjectCreateData } from "../../domain/model/ProjectCreateData";
import type { Project } from "../../domain/entities/Project";

import { DEFAULT_PROJECT_COLUMNS } from "../../domain/entities/ProjectColumn";

export class CreateProject {
  constructor(private readonly repository: ProjectRepository) {}

  async execute(data: ProjectCreateData): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: randomUUID(),
      name: data.name,
      stack: data.stack,
      status: data.status ?? "active",
      progress: 0,
      columns: DEFAULT_PROJECT_COLUMNS.map(c => ({ ...c })),
      updatedAt: now,
      createdAt: now,
      deletedAt: null,
      memberIds: data.memberIds ?? [],
    };
    return this.repository.create(project);
  }
}
