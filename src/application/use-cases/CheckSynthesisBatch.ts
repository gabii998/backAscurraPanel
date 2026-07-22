import { prisma } from "../../infrastructure/db/prisma";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { env } from "../../config/env";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export class CheckSynthesisBatch {
  async execute(brandId: string, openAiBatchId: string): Promise<{ done: boolean; insights?: string }> {
    const openAI = await resolveOpenAIService(brandId);
    const { status, outputFileId } = await openAI.getBatchStatus(openAiBatchId);

    if (status === "failed" || status === "expired" || status === "cancelled") {
      await prisma.brandLearning.updateMany({
        where: { brandId, openAiBatchId },
        data: { insightStatus: "pending" },
      });
      return { done: false };
    }

    if (status !== "completed" || !outputFileId) return { done: false };

    const results = await openAI.downloadBatchResults(outputFileId);
    const result = results.find(r => r.customId === `synthesis-${brandId}`);

    if (!result || result.error) return { done: false };

    const insights = result.content.trim();
    const now = new Date();

    await prisma.brandLearning.updateMany({
      where: { brandId, openAiBatchId },
      data: { insights, insightStatus: "done", lastSynthAt: now },
    });

    if (result.usage) {
      const { promptTokens, completionTokens } = result.usage;
      const estimatedCostUsd = calculateBatchCost(env.openAiModel, promptTokens, completionTokens);
      await prisma.igCostLog.create({
        data: {
          brandId,
          operation: "brand_synthesis",
          entityId: openAiBatchId,
          model: env.openAiModel,
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCostUsd,
          requestCount: 1,
        },
      });
    }

    return { done: true, insights };
  }
}
