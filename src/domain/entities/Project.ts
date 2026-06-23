export type ProjectStatus = "active" | "completed" | "paused";

export interface Project {
  id: string;
  name: string;
  stack: string;
  status: ProjectStatus;
  progress: number;
  updatedAt: Date;
  createdAt: Date;
  deletedAt: Date | null;
  memberIds: string[];
}
