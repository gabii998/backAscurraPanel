import type { Workspace } from "../entities/Workspace";

export interface WorkspaceRepository {
  get(): Promise<Workspace>;
  update(data: { name?: string; timezone?: string; language?: string }): Promise<Workspace>;
}
