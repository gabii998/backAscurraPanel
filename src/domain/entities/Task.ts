export type Priority = "low" | "medium" | "high" | "critical";
export type Column   = "backlog" | "progress" | "review" | "done";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  column: Column;
  labels: string[];
  dueDate: string | null;
  subtasksDone: number;
  subtasksTotal: number;
  assigneeId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}
