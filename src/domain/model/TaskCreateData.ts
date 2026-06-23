import type { Priority, Column } from "../entities/Task";

export interface TaskCreateData {
  projectId: string;
  title: string;
  description?: string;
  priority?: Priority;
  column?: Column;
  labels?: string[];
  dueDate?: string;
  subtasksDone?: number;
  subtasksTotal?: number;
  assigneeId?: string;
}

export interface TaskUpdateData {
  title?: string;
  description?: string;
  priority?: Priority;
  column?: Column;
  labels?: string[];
  dueDate?: string | null;
  subtasksDone?: number;
  subtasksTotal?: number;
  assigneeId?: string | null;
}
