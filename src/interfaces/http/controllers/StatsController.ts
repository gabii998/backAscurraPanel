import type { Request, Response } from "express";
import type { GetOverviewStats } from "../../../application/use-cases/GetOverviewStats";
import type { GetReportStats } from "../../../application/use-cases/GetReportStats";
import type { ReportPeriod } from "../../../domain/repositories/StatsRepository";

export class StatsController {
  constructor(
    private readonly getOverviewStats: GetOverviewStats,
    private readonly getReportStats: GetReportStats
  ) {}

  async handleOverview(_req: Request, res: Response): Promise<void> {
    const stats = await this.getOverviewStats.execute();
    res.json(stats);
  }

  async handleReports(req: Request, res: Response): Promise<void> {
    const period = (req.query["period"] ?? "week") as ReportPeriod;
    if (!["week", "month", "quarter"].includes(period)) {
      res.status(400).json({ message: "INVALID_PERIOD" });
      return;
    }
    const data = await this.getReportStats.execute(period);
    res.json(data);
  }
}
