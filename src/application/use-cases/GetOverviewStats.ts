import type { StatsRepository, OverviewStats } from "../../domain/repositories/StatsRepository";

export class GetOverviewStats {
  constructor(private readonly repository: StatsRepository) {}

  execute(): Promise<OverviewStats> {
    return this.repository.getOverview();
  }
}
