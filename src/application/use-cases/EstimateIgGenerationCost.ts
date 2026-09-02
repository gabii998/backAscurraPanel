import { prisma } from "../../infrastructure/db/prisma";
import { env } from "../../config/env";
import { calculateBatchCost, calculateImageBatchCost } from "../../infrastructure/services/CostCalculator";

export class EstimateIgGenerationCost {
  async execute(brandId: string, input: { quantity: number; topic?: string; campaignContext?: string; contentAssetIds?: string[] }) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { openAiModel: true, companyContext: true, acknowledge: true, voice: true } });
    if (!brand) throw new Error("BRAND_NOT_FOUND");
    const model = brand.openAiModel || env.openAiModel;
    const [styles, assets, history] = await Promise.all([
      prisma.igExamplePost.findMany({ where: { brandId, assetType: "style_reference", summaryStatus: "done" }, orderBy: { createdAt: "desc" }, take: 8, select: { styleSummary: true } }),
      prisma.igExamplePost.findMany({ where: { brandId, id: { in: input.contentAssetIds ?? [] } }, select: { title: true, description: true } }),
      prisma.igBatchJob.findMany({ where: { brandId, status: "completed", outputTokens: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 20, select: { outputTokens: true, postCount: true } }),
    ]);
    const chars = JSON.stringify(brand.companyContext).length + brand.acknowledge.length + brand.voice.length + (input.topic?.length ?? 0) + (input.campaignContext?.length ?? 0) + styles.reduce((sum, row) => sum + row.styleSummary.length, 0) + assets.reduce((sum, row) => sum + row.title.length + row.description.length, 0) + 1200;
    const inputTokens = Math.ceil(chars / 4) * input.quantity;
    const perPost = history.map(job => job.outputTokens / Math.max(1, job.postCount)).sort((a, b) => a - b);
    const outputTokensMin = Math.round((perPost[Math.floor(perPost.length * .25)] ?? 500) * input.quantity);
    const outputTokensMax = Math.round((perPost[Math.floor(perPost.length * .75)] ?? 900) * input.quantity);
    const imageCostUsd = calculateImageBatchCost(input.quantity);
    return {
      model,
      inputTokens,
      outputTokensMin,
      outputTokensMax,
      estimatedCostUsdMin: calculateBatchCost(model, inputTokens, outputTokensMin) + imageCostUsd,
      estimatedCostUsdMax: calculateBatchCost(model, inputTokens, outputTokensMax) + imageCostUsd,
    };
  }
}
