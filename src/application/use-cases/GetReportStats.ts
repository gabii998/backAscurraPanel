import type { StatsRepository, ReportStats, ReportPeriod } from "../../domain/repositories/StatsRepository";

export class GetReportStats {
  constructor(private readonly repository: StatsRepository) {}

  execute(period: ReportPeriod): Promise<ReportStats> {
    return this.repository.getReports(period);
  }
}
