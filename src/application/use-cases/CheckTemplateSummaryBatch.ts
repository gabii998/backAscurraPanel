import { prisma } from "../../infrastructure/db/prisma";
import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export class CheckTemplateSummaryBatch {
  constructor(private templateRepo: IgTemplateRepository) {}

  async execute(openAiBatchId: string, brandId: string): Promise<{ updatedCount: number }> {
    const { service: openAI, keySnapshot, model } = await resolveOpenAIService(brandId);
    const { status, outputFileId, errorFileId, errorDetail, retriedBatchId } = await openAI.getBatchStatus(openAiBatchId);

    if (retriedBatchId) {
      await prisma.igTemplate.updateMany({
        where: { summaryBatchId: openAiBatchId },
        data: { summaryBatchId: retriedBatchId, openAiKeySnapshot: keySnapshot },
      });
      return { updatedCount: 0 };
    }

    if (status === "failed" || status === "expired" || status === "cancelled") {
      console.error(`[CheckTemplateSummaryBatch] batch=${openAiBatchId} status=${status} detail=${errorDetail ?? "n/a"}`);
      await prisma.igTemplate.updateMany({
        where: { summaryBatchId: openAiBatchId },
        data: { summaryStatus: "failed", summaryError: errorDetail ?? `OpenAI batch status: ${status}` },
      });
      return { updatedCount: 0 };
    }

    if (status !== "completed" || (!outputFileId && !errorFileId)) return { updatedCount: 0 };

    const [outputResults, errorResults] = await Promise.all([
      outputFileId ? openAI.downloadBatchResults(outputFileId) : Promise.resolve([]),
      errorFileId  ? openAI.downloadBatchResults(errorFileId)  : Promise.resolve([]),
    ]);
    const results = [...outputResults, ...errorResults];
    let updatedCount = 0;
    let totalInput = 0;
    let totalOutput = 0;

    for (const result of results) {
      if (result.usage) {
        totalInput  += result.usage.promptTokens;
        totalOutput += result.usage.completionTokens;
      }
      const templateId = result.customId.replace("summary-", "");
      if (result.error) {
        console.error(`[CheckTemplateSummaryBatch] template=${templateId} error=${result.error}`);
        await this.templateRepo.update(templateId, { summaryStatus: "pending" });
        continue;
      }
      await this.templateRepo.update(templateId, {
        summary: result.content.trim(),
        summaryStatus: "done",
      });
      updatedCount++;
    }

    const estimatedCostUsd = calculateBatchCost(model, totalInput, totalOutput);

    await prisma.igCostLog.create({
      data: {
        brandId:          brandId ?? null,
        operation:        "template_summary",
        entityId:         openAiBatchId,
        model,
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
