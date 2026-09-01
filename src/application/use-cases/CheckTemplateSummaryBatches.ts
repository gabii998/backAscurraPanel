import { prisma } from "../../infrastructure/db/prisma";
import type { CheckTemplateSummaryBatch } from "./CheckTemplateSummaryBatch";

export class CheckTemplateSummaryBatches {
  constructor(private checkOne: CheckTemplateSummaryBatch) {}

  async executeAll(): Promise<void> {
    const templates = await prisma.igTemplate.findMany({
      where: { summaryStatus: "processing", summaryBatchId: { not: null } },
      select: { brandId: true, summaryBatchId: true },
    });
    await this.checkMany(templates);
  }

  async executeForBrand(brandId: string): Promise<void> {
    const templates = await prisma.igTemplate.findMany({
      where: { brandId, summaryStatus: "processing", summaryBatchId: { not: null } },
      select: { brandId: true, summaryBatchId: true },
    });
    await this.checkMany(templates);
  }

  private async checkMany(templates: { brandId: string; summaryBatchId: string | null }[]): Promise<void> {
    const seenBatchIds = new Set<string>();
    for (const t of templates) {
      if (!t.summaryBatchId || seenBatchIds.has(t.summaryBatchId)) continue;
      seenBatchIds.add(t.summaryBatchId);
      await this.checkOne.execute(t.summaryBatchId, t.brandId).catch((err: unknown) => {
        console.error(`[CheckTemplateSummaryBatches] Error checking batch ${t.summaryBatchId}:`, err);
      });
    }
  }
}
