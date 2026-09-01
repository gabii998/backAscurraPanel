import { prisma } from "../../infrastructure/db/prisma";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { env } from "../../config/env";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export class CheckSynthesisBatch {
  async execute(brandId: string, openAiBatchId: string): Promise<{ done: boolean; insights?: string }> {
    const openAI = await resolveOpenAIService(brandId);
    const { status, outputFileId, errorFileId, errorDetail, retriedBatchId } = await openAI.getBatchStatus(openAiBatchId);

    if (retriedBatchId) {
      await prisma.brandLearning.updateMany({
        where: { brandId, openAiBatchId },
        data: { openAiBatchId: retriedBatchId },
      });
      return { done: false };
    }

    if (status === "failed" || status === "expired" || status === "cancelled") {
      console.error(`[CheckSynthesisBatch] brand=${brandId} batch=${openAiBatchId} status=${status} detail=${errorDetail ?? "n/a"}`);
      await prisma.brandLearning.updateMany({
        where: { brandId, openAiBatchId },
        data: { insightStatus: "pending", insightError: errorDetail ?? `OpenAI batch status: ${status}` },
      });
      return { done: false };
    }

    if (status !== "completed" || (!outputFileId && !errorFileId)) return { done: false };

    const [outputResults, errorResults] = await Promise.all([
      outputFileId ? openAI.downloadBatchResults(outputFileId) : Promise.resolve([]),
      errorFileId  ? openAI.downloadBatchResults(errorFileId)  : Promise.resolve([]),
    ]);
    const results = [...outputResults, ...errorResults];
    const result = results.find(r => r.customId === `synthesis-${brandId}`);

    if (!result) return { done: false };
    if (result.error) {
      console.error(`[CheckSynthesisBatch] brand=${brandId} batch=${openAiBatchId} error=${result.error}`);
      await prisma.brandLearning.updateMany({
        where: { brandId, openAiBatchId },
        data: { insightStatus: "pending" },
      });
      return { done: false };
    }

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
