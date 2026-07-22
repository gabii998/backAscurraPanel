import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { OpenAIBatchService } from "../services/OpenAIBatchService";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { prisma } from "../../infrastructure/db/prisma";

export class CheckTemplateSummaryBatch {
  constructor(
    private templateRepo: IgTemplateRepository,
    private openAI:       OpenAIBatchService,
  ) {}

  async execute(openAiBatchId: string, brandId?: string): Promise<{ updatedCount: number }> {
    const { status, outputFileId } = await this.openAI.getBatchStatus(openAiBatchId);

    if (status !== "completed" || !outputFileId) return { updatedCount: 0 };

    const results = await this.openAI.downloadBatchResults(outputFileId);
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

    const estimatedCostUsd = calculateBatchCost("gpt-4o-mini", totalInput, totalOutput);

    await prisma.igCostLog.create({
      data: {
        brandId:          brandId ?? null,
        operation:        "template_summary",
        entityId:         openAiBatchId,
        model:            "gpt-4o-mini",
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
