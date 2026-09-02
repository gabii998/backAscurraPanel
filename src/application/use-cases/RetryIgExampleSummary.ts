import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";
import type { IgExamplePost } from "../../domain/entities/IgExamplePost";
import { STYLE_REFERENCE_ANALYSIS_SYSTEM_PROMPT, STYLE_REFERENCE_ANALYSIS_USER_PROMPT } from "./styleReferenceAnalysisPrompt";

export class RetryIgExampleSummary {
  async execute(brandId: string, exampleId: string): Promise<IgExamplePost> {
    const example = await prisma.igExamplePost.findFirst({ where: { id: exampleId, brandId } });
    if (!example) throw new Error("EXAMPLE_NOT_FOUND");
    if (example.assetType !== "style_reference" || !example.imageUrl) throw new Error("INVALID_STYLE_REFERENCE");

    await prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryStatus: "processing", summaryError: "", summaryBatchId: null, openAiKeySnapshot: null } });
    try {
      const { service, keySnapshot } = await resolveOpenAIService(brandId);
      const batchId = await service.submitBatch([{
        customId: `example-summary-${example.id}`,
        systemPrompt: STYLE_REFERENCE_ANALYSIS_SYSTEM_PROMPT,
        userPrompt: STYLE_REFERENCE_ANALYSIS_USER_PROMPT,
        imageUrl: example.imageUrl,
        responseFormat: "json",
      }]);
      return prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryBatchId: batchId, openAiKeySnapshot: keySnapshot, summaryStatus: "processing" } });
    } catch {
      return prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryStatus: "failed", summaryError: "STYLE_ANALYSIS_UNAVAILABLE" } });
    }
  }
}
