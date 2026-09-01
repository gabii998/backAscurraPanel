import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";

// Some models return `summary` as a flat string; others (observed with gpt-5.6-luna)
// return it as a structured object keyed by the categories the prompt asked for
// (composición, paleta, tono, ...). Flatten either shape into readable text.
function normalizeSummary(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && !!v.trim()).map(v => v.trim()).join("\n");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => typeof v === "string" && v.trim())
      .map(([k, v]) => `${k}: ${(v as string).trim()}`)
      .join("\n");
  }
  return "";
}

type PendingExample = Awaited<ReturnType<typeof prisma.igExamplePost.findMany>>[number];

export class CheckIgExampleSummaryBatches {
  async executeAll(): Promise<void> {
    const examples = await prisma.igExamplePost.findMany({ where: { summaryStatus: "processing", summaryBatchId: { not: null } } });
    await this.checkMany(examples);
  }

  async executeForBrand(brandId: string): Promise<void> {
    const examples = await prisma.igExamplePost.findMany({ where: { brandId, summaryStatus: "processing", summaryBatchId: { not: null } } });
    await this.checkMany(examples);
  }

  private async checkMany(examples: PendingExample[]): Promise<void> {
    for (const example of examples) {
      try {
        await this.checkOne(example);
      } catch (err) {
        // One example's batch failing to resolve (rotated key, expired batch, transient
        // OpenAI error) must not abort the rest — otherwise a single stuck row poisons
        // every refresh for the whole brand, hiding unrelated examples from the UI.
        console.error(`CheckIgExampleSummaryBatches: failed to check example ${example.id}`, err);
      }
    }
  }

  private async checkOne(example: PendingExample): Promise<void> {
    const { service: openAI, keySnapshot, model } = await resolveOpenAIService(example.brandId, example.openAiKeySnapshot);
    const batch = await openAI.getBatchStatus(example.summaryBatchId!);
    if (batch.retriedBatchId) {
      await prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryBatchId: batch.retriedBatchId, openAiKeySnapshot: keySnapshot } });
      return;
    }
    if (["failed", "expired", "cancelled"].includes(batch.status)) {
      await prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryStatus: "failed", summaryError: batch.errorDetail ?? `OpenAI batch status: ${batch.status}` } });
      return;
    }
    if (batch.status !== "completed" || (!batch.outputFileId && !batch.errorFileId)) return;
    const [outputResults, errorResults] = await Promise.all([
      batch.outputFileId ? openAI.downloadBatchResults(batch.outputFileId) : Promise.resolve([]),
      batch.errorFileId  ? openAI.downloadBatchResults(batch.errorFileId)  : Promise.resolve([]),
    ]);
    const [result] = [...outputResults, ...errorResults];
    if (result?.usage) {
      const estimatedCostUsd = calculateBatchCost(model, result.usage.promptTokens, result.usage.completionTokens);
      await prisma.igCostLog.create({
        data: {
          brandId:          example.brandId,
          operation:        "example_summary",
          entityId:         example.id,
          model,
          inputTokens:      result.usage.promptTokens,
          outputTokens:     result.usage.completionTokens,
          totalTokens:      result.usage.promptTokens + result.usage.completionTokens,
          estimatedCostUsd,
          requestCount:     1,
        },
      });
    }
    let summary = "";
    try {
      const parsed = JSON.parse(result?.content ?? "") as { summary?: unknown } & Record<string, unknown>;
      summary = normalizeSummary(parsed.summary);
      // Some models follow the prompt's category instructions but drop the `summary`
      // wrapper key it also asked for, returning the categorized fields directly at the
      // top level instead (e.g. {"composición": "...", "paleta": "..."} with no `summary`
      // key at all). Fall back to treating the whole parsed object as the summary source
      // rather than discarding an otherwise valid, well-formed response.
      if (!summary) summary = normalizeSummary(parsed);
    } catch { /* invalid response below */ }
    await prisma.igExamplePost.update({ where: { id: example.id }, data: summary
      ? { styleSummary: summary, summaryStatus: "done", summaryError: "" }
      : { summaryStatus: "failed", summaryError: result?.error ?? "INVALID_SUMMARY_RESULT" },
    });
  }
}
