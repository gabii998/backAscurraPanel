import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { IgBatchJob } from "../../domain/entities/IgBatchJob";

export class GetIgBatchJob {
  constructor(private repo: IgBatchJobRepository) {}

  async execute(id: string): Promise<IgBatchJob> {
    const job = await this.repo.findById(id);
    if (!job) throw new Error("BATCH_JOB_NOT_FOUND");
    return job;
  }
}
