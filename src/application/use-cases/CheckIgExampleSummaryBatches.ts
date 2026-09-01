import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export class CheckIgExampleSummaryBatches {
  async executeAll(): Promise<void> {
    const examples = await prisma.igExamplePost.findMany({ where: { summaryStatus: "processing", summaryBatchId: { not: null } } });
    for (const example of examples) {
      const openAI = await resolveOpenAIService(example.brandId);
      const batch = await openAI.getBatchStatus(example.summaryBatchId!);
      if (["failed", "expired", "cancelled"].includes(batch.status)) {
        await prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryStatus: "failed", summaryError: batch.errorDetail ?? `OpenAI batch status: ${batch.status}` } });
        continue;
      }
      if (batch.status !== "completed" || (!batch.outputFileId && !batch.errorFileId)) continue;
      const [outputResults, errorResults] = await Promise.all([
        batch.outputFileId ? openAI.downloadBatchResults(batch.outputFileId) : Promise.resolve([]),
        batch.errorFileId  ? openAI.downloadBatchResults(batch.errorFileId)  : Promise.resolve([]),
      ]);
      const [result] = [...outputResults, ...errorResults];
      let summary = "";
      try { summary = (JSON.parse(result?.content ?? "") as { summary?: string }).summary?.trim() ?? ""; } catch { /* invalid response below */ }
      await prisma.igExamplePost.update({ where: { id: example.id }, data: summary
        ? { styleSummary: summary, summaryStatus: "done", summaryError: "" }
        : { summaryStatus: "failed", summaryError: result?.error ?? "INVALID_SUMMARY_RESULT" },
      });
    }
  }
}
