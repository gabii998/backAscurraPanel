import type { ProjectStatus } from "../entities/Project";

export interface ProjectCreateData {
  name: string;
  stack: string;
  status?: ProjectStatus;
  memberIds?: string[];
}

import type { ProjectColumn } from "../entities/ProjectColumn";

export interface ProjectUpdateData {
  columns?: ProjectColumn[];
  name?: string;
  stack?: string;
  status?: ProjectStatus;
  progress?: number;
  memberIds?: string[];
}
