import type { ProjectStatus } from "../entities/Project";

export interface ProjectCreateData {
  name: string;
  stack: string;
  status?: ProjectStatus;
  memberIds?: string[];
}

export interface ProjectUpdateData {
  name?: string;
  stack?: string;
  status?: ProjectStatus;
  progress?: number;
  memberIds?: string[];
}
