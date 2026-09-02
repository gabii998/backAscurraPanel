jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igExamplePost: { findMany: jest.fn().mockResolvedValue([]) },
    igCostLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

import { CheckBatchStatus } from "../../src/application/use-cases/CheckBatchStatus";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";
import { prisma } from "../../src/infrastructure/db/prisma";
import type { IgBatchJob } from "../../src/domain/entities/IgBatchJob";
import type { IgPost } from "../../src/domain/entities/IgPost";

function baseJob(overrides: Partial<IgBatchJob> = {}): IgBatchJob {
  return {
    id: "job-1",
    brandId: "brand-1",
    openAiBatchId: "batch-1",
    imageOpenAiBatchId: null,
    openAiKeySnapshot: null,
    prompt: "",
    status: "processing",
    postCount: 1,
    errorMessage: "",
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    contentAssetIds: [],
    brandLogoUrl: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function basePost(overrides: Partial<IgPost> = {}): IgPost {
  return {
    id: "post-1", brandId: "brand-1", batchJobId: "job-1", caption: "", hashtags: [], imagePrompt: "",
    status: "generating", approvedById: null, approvedAt: null, rejectedAt: null, rejectReason: "",
    imageUrl: null, instagramMediaId: null, publishStatus: "unpublished", publishedAt: null,
    igImpressions: 0, igReach: 0, igEngagement: 0, igSaved: 0, igSyncedAt: null,
    inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe("CheckBatchStatus — text phase (job.status 'processing')", () => {
  beforeEach(() => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.igCostLog.create as jest.Mock).mockClear();
  });

  it("stores OpenAI's real validation error in errorMessage when the text batch fails", async () => {
    const job = baseJob();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "failed" }) };
    const postRepo = { findByBatchJobId: jest.fn() };
    const storage = { put: jest.fn() };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({
        status: "failed",
        errorDetail: "invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.",
      }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-4o-mini" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, storage as any).execute("job-1");

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", {
      status: "failed",
      errorMessage: "invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.",
    });
  });

  it("switches to the retried batch id and keeps status processing when getBatchStatus recreates the batch", async () => {
    const job = baseJob();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, openAiBatchId: "batch-retry-1" }) };
    const postRepo = { findByBatchJobId: jest.fn() };
    const storage = { put: jest.fn() };
    const openAI = { getBatchStatus: jest.fn().mockResolvedValue({ status: "validating", retriedBatchId: "batch-retry-1" }) };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-4o-mini" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, storage as any).execute("job-1");

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", { openAiBatchId: "batch-retry-1", openAiKeySnapshot: "enc-key", status: "processing" });
  });

  it("marks the job completed directly when no post produced a usable imagePrompt", async () => {
    const job = baseJob();
    const post = basePost();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([post]), update: jest.fn().mockResolvedValue(post) };
    const storage = { put: jest.fn() };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out" }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "post-0",
        content: JSON.stringify({ caption: "Hola", hashtags: ["#a"], imagePrompt: "" }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }]),
      submitImageBatch: jest.fn(),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-4o-mini" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, storage as any).execute("job-1");

    expect(openAI.submitImageBatch).not.toHaveBeenCalled();
    expect(jobRepo.update).toHaveBeenCalledWith("job-1", expect.objectContaining({ status: "completed" }));
  });

  it("submits an image batch and moves the job to 'generating_images' once the text phase produces imagePrompts", async () => {
    const job = baseJob({ brandLogoUrl: "https://cdn/logo.png", contentAssetIds: ["asset-1"] });
    const post = basePost();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "generating_images" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([post]), update: jest.fn().mockResolvedValue(post) };
    const storage = { put: jest.fn() };
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([{ imageUrl: "https://cdn/asset-1.png" }]);
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out" }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "post-0",
        content: JSON.stringify({ caption: "Hola", hashtags: ["#a"], imagePrompt: "Foto de producto realista" }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }]),
      submitImageBatch: jest.fn().mockResolvedValue("image-batch-1"),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-4o-mini" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, storage as any).execute("job-1");

    expect(postRepo.update).toHaveBeenCalledWith("post-1", expect.objectContaining({ imagePrompt: "Foto de producto realista" }));
    expect(openAI.submitImageBatch).toHaveBeenCalledWith(
      [{ customId: "post-0", prompt: "Foto de producto realista" }],
      ["https://cdn/logo.png", "https://cdn/asset-1.png"],
    );
    expect(jobRepo.update).toHaveBeenCalledWith("job-1", expect.objectContaining({ status: "generating_images", imageOpenAiBatchId: "image-batch-1" }));
  });

  it("rejects a post outright when its text result carries an error, without ever requesting an image for it", async () => {
    const job = baseJob();
    const post = basePost();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([post]), update: jest.fn().mockResolvedValue(post) };
    const storage = { put: jest.fn() };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out" }),
      downloadBatchResults: jest.fn().mockResolvedValue([{ customId: "post-0", content: "", error: "modelo rechazó el pedido" }]),
      submitImageBatch: jest.fn(),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-4o-mini" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, storage as any).execute("job-1");

    expect(postRepo.update).toHaveBeenCalledWith("post-1", expect.objectContaining({ status: "rejected" }));
    expect(openAI.submitImageBatch).not.toHaveBeenCalled();
  });
});

describe("CheckBatchStatus — image phase (job.status 'generating_images')", () => {
  beforeEach(() => {
    (prisma.igCostLog.create as jest.Mock).mockClear();
  });

  it("uploads the decoded image, marks the post draft, and completes the job", async () => {
    const job = baseJob({ status: "generating_images", imageOpenAiBatchId: "image-batch-1", estimatedCostUsd: 0.01 });
    const post = basePost({ imagePrompt: "Foto de producto" });
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([post]), update: jest.fn().mockResolvedValue(post) };
    const storage = { put: jest.fn().mockResolvedValue("https://r2/instagram/brand-1/posts/post-1/x.png") };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out" }),
      downloadImageBatchResults: jest.fn().mockResolvedValue([{ customId: "post-0", b64Json: Buffer.from("fake-png").toString("base64") }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-4o-mini" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, storage as any).execute("job-1");

    expect(storage.put).toHaveBeenCalledWith(expect.stringContaining("instagram/brand-1/posts/post-1/"), Buffer.from("fake-png"), "image/png");
    expect(postRepo.update).toHaveBeenCalledWith("post-1", { imageUrl: "https://r2/instagram/brand-1/posts/post-1/x.png", status: "draft" });
    expect(jobRepo.update).toHaveBeenCalledWith("job-1", expect.objectContaining({ status: "completed" }));
  });

  it("rejects a post when its image result carries an error instead of leaving it stuck generating", async () => {
    const job = baseJob({ status: "generating_images", imageOpenAiBatchId: "image-batch-1" });
    const post = basePost();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([post]), update: jest.fn().mockResolvedValue(post) };
    const storage = { put: jest.fn() };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out" }),
      downloadImageBatchResults: jest.fn().mockResolvedValue([{ customId: "post-0", error: "content_policy_violation" }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-4o-mini" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, storage as any).execute("job-1");

    expect(storage.put).not.toHaveBeenCalled();
    expect(postRepo.update).toHaveBeenCalledWith("post-1", expect.objectContaining({ status: "rejected" }));
  });

  it("skips posts already rejected in the text phase — never treats a missing image result for them as a new failure", async () => {
    const job = baseJob({ status: "generating_images", imageOpenAiBatchId: "image-batch-1" });
    const rejectedPost = basePost({ status: "rejected", rejectReason: "[error de generación] x" });
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([rejectedPost]), update: jest.fn().mockResolvedValue(rejectedPost) };
    const storage = { put: jest.fn() };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out" }),
      downloadImageBatchResults: jest.fn().mockResolvedValue([]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-4o-mini" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, storage as any).execute("job-1");

    expect(postRepo.update).not.toHaveBeenCalled();
  });
});
