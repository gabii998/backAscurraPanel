import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { prisma } from "../../infrastructure/db/prisma";
import { env } from "../../config/env";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export class CheckTemplateSummaryBatch {
  constructor(private templateRepo: IgTemplateRepository) {}

  async execute(openAiBatchId: string, brandId: string): Promise<{ updatedCount: number }> {
    const openAI = await resolveOpenAIService(brandId);
    const { status, outputFileId } = await openAI.getBatchStatus(openAiBatchId);

    if (status !== "completed" || !outputFileId) return { updatedCount: 0 };

    const results = await openAI.downloadBatchResults(outputFileId);
    let updatedCount = 0;
    let totalInput = 0;
    let totalOutput = 0;

    for (const result of results) {
      if (result.usage) {
        totalInput  += result.usage.promptTokens;
        totalOutput += result.usage.completionTokens;
      }
      if (result.error) continue;
      const templateId = result.customId.replace("summary-", "");
      await this.templateRepo.update(templateId, {
        summary: result.content.trim(),
        summaryStatus: "done",
      });
      updatedCount++;
    }

    const estimatedCostUsd = calculateBatchCost(env.openAiModel, totalInput, totalOutput);

    await prisma.igCostLog.create({
      data: {
        brandId:          brandId ?? null,
        operation:        "template_summary",
        entityId:         openAiBatchId,
        model:            env.openAiModel,
        inputTokens:      totalInput,
        outputTokens:     totalOutput,
        totalTokens:      totalInput + totalOutput,
        estimatedCostUsd,
        requestCount:     results.length,
      },
    });

    return { updatedCount };
  }
}
