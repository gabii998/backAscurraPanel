import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { IgBatchJob } from "../../domain/entities/IgBatchJob";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { prisma } from "../../infrastructure/db/prisma";
import { env } from "../../config/env";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

interface PostResult {
  caption: string;
  hashtags: string[];
  templateId: string | null;
  templateHtml: string | null;
  templateName: string | null;
  variables: Record<string, string>;
}

export class CheckBatchStatus {
  constructor(
    private jobRepo:      IgBatchJobRepository,
    private postRepo:     IgPostRepository,
    private templateRepo: IgTemplateRepository,
  ) {}

  async execute(jobId: string): Promise<IgBatchJob> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new Error("BATCH_JOB_NOT_FOUND");

    if (job.status === "completed" || job.status === "failed") return job;
    if (!job.openAiBatchId) return job;

    const openAI = await resolveOpenAIService(job.brandId);
    const { status, outputFileId } = await openAI.getBatchStatus(job.openAiBatchId);

    if (status === "failed" || status === "expired" || status === "cancelled") {
      return this.jobRepo.update(jobId, { status: "failed", errorMessage: `OpenAI batch status: ${status}` });
    }

    if (status !== "completed" || !outputFileId) {
      return this.jobRepo.update(jobId, { status: "processing" });
    }

    const results = await openAI.downloadBatchResults(outputFileId);
    const posts = await this.postRepo.findByBatchJobId(jobId);

    let totalInput = 0;
    let totalOutput = 0;

    for (let i = 0; i < results.length && i < posts.length; i++) {
      const result = results[i];
      const post = posts[i];

      if (result.usage) {
        totalInput  += result.usage.promptTokens;
        totalOutput += result.usage.completionTokens;
      }

      if (result.error) continue;

      let parsed: PostResult;
      try {
        parsed = JSON.parse(result.content) as PostResult;
      } catch {
        continue;
      }

      let templateId = parsed.templateId ?? null;

      if (!templateId && parsed.templateHtml && parsed.templateName) {
        const html = parsed.templateHtml;
        const variables = extractVariables(html);
        const created = await this.templateRepo.create({
          brandId: post.brandId,
          name: parsed.templateName,
          html,
          variables,
          isAiGenerated: true,
        });
        templateId = created.id;
      }

      await this.postRepo.update(post.id, {
        caption: parsed.caption ?? "",
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        variables: parsed.variables ?? {},
        templateId,
        status: "draft",
      });
    }

    const estimatedCostUsd = calculateBatchCost(env.openAiModel, totalInput, totalOutput);

    await prisma.igCostLog.create({
      data: {
        brandId:          job.brandId,
        operation:        "post_generation",
        entityId:         jobId,
        model:            env.openAiModel,
        inputTokens:      totalInput,
        outputTokens:     totalOutput,
        totalTokens:      totalInput + totalOutput,
        estimatedCostUsd,
        requestCount:     results.length,
      },
    });

    return this.jobRepo.update(jobId, {
      status: "completed",
      inputTokens: totalInput,
      outputTokens: totalOutput,
      estimatedCostUsd,
    });
  }
}

function extractVariables(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
}
