import type { WorkspaceRepository } from "../../domain/repositories/WorkspaceRepository";
import type { Workspace } from "../../domain/entities/Workspace";

export class GetWorkspace {
  constructor(private readonly repository: WorkspaceRepository) {}

  async execute(): Promise<Workspace> {
    return this.repository.get();
  }
}
