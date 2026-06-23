import type { Project, ProjectStatus } from "../entities/Project";

export interface ListProjectsFilter {
  status?: ProjectStatus;
  query?: string;
}

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  list(filter: ListProjectsFilter): Promise<Project[]>;
  create(project: Project): Promise<Project>;
  update(id: string, data: Partial<Omit<Project, "id" | "createdAt" | "deletedAt" | "memberIds">>, memberIds?: string[]): Promise<Project | null>;
  softDelete(id: string): Promise<boolean>;
}
