import type { WorkspaceRepository } from "../../domain/repositories/WorkspaceRepository";
import type { Workspace } from "../../domain/entities/Workspace";

export class UpdateWorkspace {
  constructor(private readonly repository: WorkspaceRepository) {}

  async execute(data: { name?: string; timezone?: string; language?: string }): Promise<Workspace> {
    return this.repository.update(data);
  }
}
