import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { IgBatchJob } from "../../domain/entities/IgBatchJob";

export class ListIgBatchJobs {
  constructor(private repo: IgBatchJobRepository) {}

  async execute(brandId: string): Promise<IgBatchJob[]> {
    return this.repo.findByBrandId(brandId);
  }
}
