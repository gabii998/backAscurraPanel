import { prisma } from "../db/prisma";
import type { OverviewStats, ReportStats, ReportPeriod, StatsRepository } from "../../domain/repositories/StatsRepository";

const DAY_LABELS_ES = ["D", "L", "M", "X", "J", "V", "S"];

export class PrismaStatsRepository implements StatsRepository {
  async getOverview(): Promise<OverviewStats> {
    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [activeProjects, pendingTasks, unresolvedErrors, activeClients, occurrences] =
      await Promise.all([
        prisma.project.count({ where: { status: "active", deletedAt: null } }),
        prisma.task.count({ where: { column: { in: ["backlog", "progress"] }, deletedAt: null } }),
        prisma.appError.count({ where: { status: "unresolved", deletedAt: null } }),
        prisma.client.count({ where: { status: "active", deletedAt: null } }),
        prisma.errorOccurrence.findMany({
          where: { createdAt: { gte: since14 } },
          select: { createdAt: true },
        }),
      ]);

    const trendMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(since14);
      d.setDate(d.getDate() + i);
      trendMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const occ of occurrences) {
      const key = occ.createdAt.toISOString().slice(0, 10);
      trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
    const errorTrend = [...trendMap.values()];

    return { activeProjects, pendingTasks, unresolvedErrors, activeClients, errorTrend };
  }

  async getReports(period: ReportPeriod): Promise<ReportStats> {
    const days = period === "week" ? 7 : period === "month" ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [tasks, projectGroups, activeClients, users] = await Promise.all([
      prisma.task.findMany({
        where: { deletedAt: null, createdAt: { gte: since } },
        select: { column: true, createdAt: true, assigneeId: true },
      }),
      prisma.project.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
      prisma.client.count({ where: { status: "active", deletedAt: null } }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, initials: true, color: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const tasksDone = tasks.filter(t => t.column === "done").length;
    const activeProjects = projectGroups.find(g => g.status === "active")?._count ?? 0;
    const teamVelocity = users.length > 0 ? Math.round((tasksDone / users.length) * 10) / 10 : 0;

    const projectStatus = {
      active: projectGroups.find(g => g.status === "active")?._count ?? 0,
      completed: projectGroups.find(g => g.status === "completed")?._count ?? 0,
      paused: projectGroups.find(g => g.status === "paused")?._count ?? 0,
    };

    const tasksByPeriod = this.buildBars(period, since, tasks);

    const team = users.map(u => {
      const assigned = tasks.filter(t => t.assigneeId === u.id);
      return {
        id: u.id,
        name: u.name,
        initials: u.initials,
        color: u.color,
        completed: assigned.filter(t => t.column === "done").length,
        total: assigned.length,
      };
    }).filter(u => u.total > 0);

    return {
      kpis: { tasksDone, activeProjects, teamVelocity, activeClients },
      tasksByPeriod,
      projectStatus,
      team,
    };
  }

  private buildBars(
    period: ReportPeriod,
    since: Date,
    tasks: { column: string; createdAt: Date }[]
  ): { label: string; done: number; total: number }[] {
    if (period === "week") {
      const bars: { label: string; done: number; total: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const dayTasks = tasks.filter(t => t.createdAt.toISOString().slice(0, 10) === key);
        bars.push({
          label: DAY_LABELS_ES[d.getDay()],
          done: dayTasks.filter(t => t.column === "done").length,
          total: dayTasks.length,
        });
      }
      return bars;
    }

    if (period === "month") {
      return [1, 2, 3, 4].map(week => {
        const weekStart = new Date(since);
        weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekTasks = tasks.filter(t => t.createdAt >= weekStart && t.createdAt < weekEnd);
        return {
          label: `S${week}`,
          done: weekTasks.filter(t => t.column === "done").length,
          total: weekTasks.length,
        };
      });
    }

    // quarter: 3 months
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return [0, 1, 2].map(offset => {
      const mStart = new Date(since);
      mStart.setMonth(mStart.getMonth() + offset);
      mStart.setDate(1);
      const mEnd = new Date(mStart);
      mEnd.setMonth(mEnd.getMonth() + 1);
      const mTasks = tasks.filter(t => t.createdAt >= mStart && t.createdAt < mEnd);
      return {
        label: monthNames[mStart.getMonth()],
        done: mTasks.filter(t => t.column === "done").length,
        total: mTasks.length,
      };
    });
  }
}
