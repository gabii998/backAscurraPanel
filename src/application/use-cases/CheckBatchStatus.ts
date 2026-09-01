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
    const { status, outputFileId, errorFileId, errorDetail } = await openAI.getBatchStatus(job.openAiBatchId);

    if (status === "failed" || status === "expired" || status === "cancelled") {
      return this.jobRepo.update(jobId, { status: "failed", errorMessage: errorDetail ?? `OpenAI batch status: ${status}` });
    }

    if (status !== "completed" || (!outputFileId && !errorFileId)) {
      return this.jobRepo.update(jobId, { status: "processing" });
    }

    const [outputResults, errorResults] = await Promise.all([
      outputFileId ? openAI.downloadBatchResults(outputFileId) : Promise.resolve([]),
      errorFileId  ? openAI.downloadBatchResults(errorFileId)  : Promise.resolve([]),
    ]);
    const results = [...outputResults, ...errorResults];
    const resultsByCustomId = new Map(results.map(r => [r.customId, r]));
    const posts = await this.postRepo.findByBatchJobId(jobId);
    const assets = job.contentAssetIds.length > 0
      ? await prisma.igExamplePost.findMany({ where: { brandId: job.brandId, id: { in: job.contentAssetIds } }, select: { id: true, imageUrl: true } })
      : [];
    const assetUrls = job.contentAssetIds.map(id => assets.find(asset => asset.id === id)?.imageUrl ?? "");

    let totalInput = 0;
    let totalOutput = 0;

    for (let i = 0; i < posts.length; i++) {
      const result = resultsByCustomId.get(`post-${i}`);
      const post = posts[i];
      if (!result) continue;

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
        variables: {
          ...(parsed.variables ?? {}),
          ...Object.fromEntries(assetUrls.map((url, index) => [`assetImageUrl${index + 1}`, url])),
          ...(job.brandLogoUrl ? { brandLogoUrl: job.brandLogoUrl } : {}),
        },
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
