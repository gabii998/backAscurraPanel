import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { prisma } from "../../infrastructure/db/prisma";
import { env } from "../../config/env";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export class CheckTemplateSummaryBatch {
  constructor(private templateRepo: IgTemplateRepository) {}

  async execute(openAiBatchId: string, brandId: string): Promise<{ updatedCount: number }> {
    const openAI = await resolveOpenAIService(brandId);
    // autoRetryOnFileError: false — IgTemplate has no column to persist a retried batch id,
    // and the frontend always re-polls with the original id, so an unbounded auto-retry
    // inside getBatchStatus would recreate a fresh OpenAI batch on every single poll here.
    const { status, outputFileId, errorFileId, errorDetail } = await openAI.getBatchStatus(openAiBatchId, { autoRetryOnFileError: false });

    if (status === "failed" || status === "expired" || status === "cancelled") {
      console.error(`[CheckTemplateSummaryBatch] batch=${openAiBatchId} status=${status} detail=${errorDetail ?? "n/a"}`);
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
