import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { IgBatchJob } from "../../domain/entities/IgBatchJob";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";
import { normalizeAssetUrl } from "../../infrastructure/utils/normalizeAssetUrl";

interface PostResult {
  caption: string;
  hashtags: string[];
  templateId: string | null;
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

    const { service: openAI, keySnapshot, model } = await resolveOpenAIService(job.brandId, job.openAiKeySnapshot);
    const { status, outputFileId, errorFileId, errorDetail, retriedBatchId } = await openAI.getBatchStatus(job.openAiBatchId);

    if (retriedBatchId) {
      return this.jobRepo.update(jobId, { openAiBatchId: retriedBatchId, openAiKeySnapshot: keySnapshot, status: "processing" });
    }

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
    const assetUrls = job.contentAssetIds.map(id => {
      const url = assets.find(asset => asset.id === id)?.imageUrl ?? "";
      return url ? normalizeAssetUrl(url) : url;
    });

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

      const postCostUsd = result.usage
        ? calculateBatchCost(model, result.usage.promptTokens, result.usage.completionTokens)
        : 0;

      let parsed: PostResult;
      try {
        parsed = JSON.parse(result.content) as PostResult;
      } catch {
        continue;
      }

      const templateId = parsed.templateId ?? null;

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
        inputTokens: result.usage?.promptTokens ?? 0,
        outputTokens: result.usage?.completionTokens ?? 0,
        estimatedCostUsd: postCostUsd,
      });
    }

    const estimatedCostUsd = calculateBatchCost(model, totalInput, totalOutput);

    await prisma.igCostLog.create({
      data: {
        brandId:          job.brandId,
        operation:        "post_generation",
        entityId:         jobId,
        model,
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
