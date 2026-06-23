import type { ProjectRepository } from "../../domain/repositories/ProjectRepository";

export class DeleteProject {
  constructor(private readonly repository: ProjectRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) throw new Error("PROJECT_NOT_FOUND");
  }
}
