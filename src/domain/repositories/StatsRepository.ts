export interface OverviewStats {
  activeProjects: number;
  pendingTasks: number;
  unresolvedErrors: number;
  activeClients: number;
  errorTrend: number[];
}

export interface ReportStats {
  kpis: {
    tasksDone: number;
    activeProjects: number;
    teamVelocity: number;
    activeClients: number;
  };
  tasksByPeriod: { label: string; done: number; total: number }[];
  projectStatus: { active: number; completed: number; paused: number };
  team: {
    id: string;
    name: string;
    initials: string;
    color: string;
    completed: number;
    total: number;
  }[];
}

export type ReportPeriod = "week" | "month" | "quarter";

export interface StatsRepository {
  getOverview(): Promise<OverviewStats>;
  getReports(period: ReportPeriod): Promise<ReportStats>;
}
