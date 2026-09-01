import { prisma } from "../../infrastructure/db/prisma";
import type { CheckSynthesisBatch } from "./CheckSynthesisBatch";

export class CheckSynthesisBatches {
  constructor(private checkOne: CheckSynthesisBatch) {}

  async executeAll(): Promise<void> {
    const pending = await prisma.brandLearning.findMany({
      where: { insightStatus: "processing", openAiBatchId: { not: null } },
      select: { brandId: true, openAiBatchId: true },
    });
    for (const { brandId, openAiBatchId } of pending) {
      if (!openAiBatchId) continue;
      await this.checkOne.execute(brandId, openAiBatchId).catch((err: unknown) => {
        console.error(`[CheckSynthesisBatches] Error checking brand ${brandId} batch ${openAiBatchId}:`, err);
      });
    }
  }
}
