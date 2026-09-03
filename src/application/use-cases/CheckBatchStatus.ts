import { randomUUID } from "crypto";
import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgBatchJob } from "../../domain/entities/IgBatchJob";
import { TECHNICAL_REJECTION_PREFIX_GENERATION, TECHNICAL_REJECTION_PREFIX_IMAGE } from "../../domain/entities/IgPost";
import type { R2Storage } from "../../infrastructure/services/R2Storage";
import { calculateBatchCost, calculateImageBatchCost } from "../../infrastructure/services/CostCalculator";
import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";
import { normalizeAssetUrl } from "../../infrastructure/utils/normalizeAssetUrl";

interface TextResult {
  caption: string;
  hashtags: string[];
  imagePrompt: string;
}

// Generating a batch of posts is now two chained OpenAI batches: first a text batch writes
// caption/hashtags/imagePrompt per post (see GenerateIgPosts), then an image batch turns each
// imagePrompt into the actual post image via gpt-image-1. This use-case drives both phases —
// job.status "processing" means the text batch is in flight, "generating_images" means the
// image batch is — and is polled repeatedly (see batchPollingJob) until "completed"/"failed".
export class CheckBatchStatus {
  constructor(
    private jobRepo:  IgBatchJobRepository,
    private postRepo: IgPostRepository,
    private storage:  R2Storage,
  ) {}

  async execute(jobId: string): Promise<IgBatchJob> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new Error("BATCH_JOB_NOT_FOUND");

    if (job.status === "completed" || job.status === "failed") return job;
    if (job.status === "generating_images") return this.checkImagePhase(job);
    return this.checkTextPhase(job);
  }

  private async checkTextPhase(job: IgBatchJob): Promise<IgBatchJob> {
    if (!job.openAiBatchId) return job;

    const { service: openAI, keySnapshot, model } = await resolveOpenAIService(job.brandId, job.openAiKeySnapshot);
    const { status, outputFileId, errorFileId, errorDetail, retriedBatchId } = await openAI.getBatchStatus(job.openAiBatchId);

    if (retriedBatchId) {
      return this.jobRepo.update(job.id, { openAiBatchId: retriedBatchId, openAiKeySnapshot: keySnapshot, status: "processing" });
    }
    if (status === "failed" || status === "expired" || status === "cancelled") {
      return this.jobRepo.update(job.id, { status: "failed", errorMessage: errorDetail ?? `OpenAI batch status: ${status}` });
    }
    if (status !== "completed" || (!outputFileId && !errorFileId)) {
      return this.jobRepo.update(job.id, { status: "processing" });
    }

    const [outputResults, errorResults] = await Promise.all([
      outputFileId ? openAI.downloadBatchResults(outputFileId) : Promise.resolve([]),
      errorFileId  ? openAI.downloadBatchResults(errorFileId)  : Promise.resolve([]),
    ]);
    const results = [...outputResults, ...errorResults];
    const resultsByCustomId = new Map(results.map(r => [r.customId, r]));
    const posts = await this.postRepo.findByBatchJobId(job.id);

    let totalInput = 0;
    let totalOutput = 0;
    const imageRequests: Array<{ customId: string; prompt: string }> = [];

    for (let i = 0; i < posts.length; i++) {
      const result = resultsByCustomId.get(`post-${i}`);
      const post = posts[i];
      if (!result) continue;

      if (result.usage) {
        totalInput  += result.usage.promptTokens;
        totalOutput += result.usage.completionTokens;
      }

      if (result.error) {
        await this.postRepo.update(post.id, { status: "rejected", rejectReason: `${TECHNICAL_REJECTION_PREFIX_GENERATION} ${result.error}` });
        continue;
      }

      let parsed: TextResult;
      try {
        parsed = JSON.parse(result.content) as TextResult;
      } catch {
        await this.postRepo.update(post.id, { status: "rejected", rejectReason: `${TECHNICAL_REJECTION_PREFIX_GENERATION} respuesta inválida` });
        continue;
      }

      await this.postRepo.update(post.id, {
        caption: parsed.caption ?? "",
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        imagePrompt: parsed.imagePrompt ?? "",
      });

      if (parsed.imagePrompt?.trim()) imageRequests.push({ customId: `post-${i}`, prompt: parsed.imagePrompt });
    }

    const textCostUsd = calculateBatchCost(model, totalInput, totalOutput);
    await prisma.igCostLog.create({
      data: {
        brandId:      job.brandId,
        operation:    "post_generation",
        entityId:     job.id,
        model,
        inputTokens:  totalInput,
        outputTokens: totalOutput,
        totalTokens:  totalInput + totalOutput,
        estimatedCostUsd: textCostUsd,
        requestCount: results.length,
      },
    });

    if (imageRequests.length === 0) {
      return this.jobRepo.update(job.id, { status: "completed", inputTokens: totalInput, outputTokens: totalOutput, estimatedCostUsd: textCostUsd });
    }

    const assets = job.contentAssetIds.length > 0
      ? await prisma.igExamplePost.findMany({ where: { brandId: job.brandId, id: { in: job.contentAssetIds } }, select: { imageUrl: true } })
      : [];
    const referenceImageUrls = [
      ...(job.brandLogoUrl ? [job.brandLogoUrl] : []),
      ...assets.map(a => normalizeAssetUrl(a.imageUrl)),
    ];

    const imageBatchId = await openAI.submitImageBatch(imageRequests, referenceImageUrls);

    return this.jobRepo.update(job.id, {
      status: "generating_images",
      imageOpenAiBatchId: imageBatchId,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      estimatedCostUsd: textCostUsd,
    });
  }

  private async checkImagePhase(job: IgBatchJob): Promise<IgBatchJob> {
    if (!job.imageOpenAiBatchId) return job;

    const { service: openAI, keySnapshot } = await resolveOpenAIService(job.brandId, job.openAiKeySnapshot);
    const { status, outputFileId, errorFileId, errorDetail, retriedBatchId } = await openAI.getBatchStatus(job.imageOpenAiBatchId);

    if (retriedBatchId) {
      return this.jobRepo.update(job.id, { imageOpenAiBatchId: retriedBatchId, openAiKeySnapshot: keySnapshot, status: "generating_images" });
    }
    if (status === "failed" || status === "expired" || status === "cancelled") {
      return this.jobRepo.update(job.id, { status: "failed", errorMessage: errorDetail ?? `OpenAI batch de imagen status: ${status}` });
    }
    if (status !== "completed" || (!outputFileId && !errorFileId)) {
      return this.jobRepo.update(job.id, { status: "generating_images" });
    }

    const [outputResults, errorResults] = await Promise.all([
      outputFileId ? openAI.downloadImageBatchResults(outputFileId) : Promise.resolve([]),
      errorFileId  ? openAI.downloadImageBatchResults(errorFileId)  : Promise.resolve([]),
    ]);
    const results = [...outputResults, ...errorResults];
    const resultsByCustomId = new Map(results.map(r => [r.customId, r]));
    const posts = await this.postRepo.findByBatchJobId(job.id);

    let imageCount = 0;
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      // Posts already rejected in the text phase (parse/content errors) never got an image
      // request submitted — nothing to do for them here.
      if (post.status !== "generating") continue;

      const result = resultsByCustomId.get(`post-${i}`);
      if (!result || result.error || !result.b64Json) {
        await this.postRepo.update(post.id, { status: "rejected", rejectReason: `${TECHNICAL_REJECTION_PREFIX_IMAGE} ${result?.error ?? "sin imagen en la respuesta"}` });
        continue;
      }

      const buffer = Buffer.from(result.b64Json, "base64");
      const key = `instagram/${job.brandId}/posts/${post.id}/${randomUUID()}.png`;
      const imageUrl = await this.storage.put(key, buffer, "image/png");
      await this.postRepo.update(post.id, { imageUrl, status: "draft" });
      imageCount++;
    }

    const imageCostUsd = calculateImageBatchCost(imageCount);
    await prisma.igCostLog.create({
      data: {
        brandId:      job.brandId,
        operation:    "post_image_generation",
        entityId:     job.id,
        model:        "gpt-image-1",
        inputTokens:  0,
        outputTokens: 0,
        totalTokens:  0,
        estimatedCostUsd: imageCostUsd,
        requestCount: results.length,
      },
    });

    return this.jobRepo.update(job.id, {
      status: "completed",
      estimatedCostUsd: job.estimatedCostUsd + imageCostUsd,
    });
  }
}
