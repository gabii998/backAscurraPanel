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
import type { IgBatchJob } from "../../src/domain/entities/IgBatchJob";

function baseJob(overrides: Partial<IgBatchJob> = {}): IgBatchJob {
  return {
    id: "job-1",
    brandId: "brand-1",
    openAiBatchId: "batch-1",
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

describe("CheckBatchStatus", () => {
  it("stores OpenAI's real validation error in errorMessage when getBatchStatus provides one", async () => {
    const job = baseJob();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "failed" }) };
    const postRepo = { findByBatchJobId: jest.fn() };
    const templateRepo = {};
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({
        status: "failed",
        outputFileId: undefined,
        errorFileId: undefined,
        errorDetail: "invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.",
      }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, templateRepo as any).execute("job-1");

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", {
      status: "failed",
      errorMessage: "invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.",
    });
  });

  it("switches to the retried batch id and keeps status processing when getBatchStatus recreates the batch", async () => {
    const job = baseJob();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, openAiBatchId: "batch-retry-1", status: "processing" }) };
    const postRepo = { findByBatchJobId: jest.fn() };
    const templateRepo = {};
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "validating", outputFileId: undefined, errorFileId: undefined, retriedBatchId: "batch-retry-1" }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, templateRepo as any).execute("job-1");

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", { openAiBatchId: "batch-retry-1", openAiKeySnapshot: "enc-key", status: "processing" });
  });

  it("falls back to a generic message when getBatchStatus provides no errorDetail", async () => {
    const job = baseJob();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "failed" }) };
    const postRepo = { findByBatchJobId: jest.fn() };
    const templateRepo = {};
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "expired", outputFileId: undefined, errorFileId: undefined }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, templateRepo as any).execute("job-1");

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", {
      status: "failed",
      errorMessage: "OpenAI batch status: expired",
    });
  });

  it("persists each post's own token usage and cost, not just the job-level total", async () => {
    const job = baseJob();
    const post = {
      id: "post-1", brandId: "brand-1", templateId: "tpl-1", caption: "", hashtags: [], variables: {},
      status: "generating", approvedById: null, approvedAt: null, rejectedAt: null, rejectReason: "",
      imageUrl: null, instagramMediaId: null, publishStatus: "unpublished", publishedAt: null,
      igImpressions: 0, igReach: 0, igEngagement: 0, igSaved: 0, igSyncedAt: null,
      inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, createdAt: new Date(), updatedAt: new Date(),
    };
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([post]), update: jest.fn().mockResolvedValue(post) };
    const templateRepo = {};
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "post-0",
        content: JSON.stringify({ caption: "Hola", hashtags: ["#a"], templateId: "tpl-1", templateHtml: null, templateName: null, variables: {} }),
        error: undefined,
        usage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 },
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, templateRepo as any).execute("job-1");

    expect(postRepo.update).toHaveBeenCalledWith("post-1", expect.objectContaining({
      inputTokens: 300,
      outputTokens: 100,
      estimatedCostUsd: expect.any(Number),
    }));
    const [, updateData] = (postRepo.update as jest.Mock).mock.calls[0];
    expect(updateData.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("logs the brand's own resolved model, not the server's global default, for both the per-post cost and the job-level cost log", async () => {
    const job = baseJob();
    const post = {
      id: "post-1", brandId: "brand-1", templateId: "tpl-1", caption: "", hashtags: [], variables: {},
      status: "generating", approvedById: null, approvedAt: null, rejectedAt: null, rejectReason: "",
      imageUrl: null, instagramMediaId: null, publishStatus: "unpublished", publishedAt: null,
      igImpressions: 0, igReach: 0, igEngagement: 0, igSaved: 0, igSyncedAt: null,
      inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, createdAt: new Date(), updatedAt: new Date(),
    };
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([post]), update: jest.fn().mockResolvedValue(post) };
    const templateRepo = {};
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "post-0",
        content: JSON.stringify({ caption: "Hola", hashtags: ["#a"], templateId: "tpl-1", variables: {} }),
        error: undefined,
        usage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 },
      }]),
    };
    // A brand with its own custom model configured — resolveOpenAIService resolves this
    // per-brand model, distinct from whatever the server's global env.openAiModel is.
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key", model: "gpt-5.6-luna" });
    const { prisma } = require("../../src/infrastructure/db/prisma");

    await new CheckBatchStatus(jobRepo as any, postRepo as any, templateRepo as any).execute("job-1");

    expect(prisma.igCostLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ model: "gpt-5.6-luna" }),
    }));
  });

  it("never invents/creates a new template even when a result has no templateId — posts always draw from an existing template", async () => {
    const job = baseJob();
    const post = {
      id: "post-1", brandId: "brand-1", templateId: null, caption: "", hashtags: [], variables: {},
      status: "generating", approvedById: null, approvedAt: null, rejectedAt: null, rejectReason: "",
      imageUrl: null, instagramMediaId: null, publishStatus: "unpublished", publishedAt: null,
      igImpressions: 0, igReach: 0, igEngagement: 0, igSaved: 0, igSyncedAt: null,
      inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, createdAt: new Date(), updatedAt: new Date(),
    };
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const postRepo = { findByBatchJobId: jest.fn().mockResolvedValue([post]), update: jest.fn().mockResolvedValue(post) };
    const templateRepo = { create: jest.fn() };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "post-0",
        content: JSON.stringify({ caption: "Hola", hashtags: ["#a"], templateId: null, variables: {} }),
        error: undefined,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckBatchStatus(jobRepo as any, postRepo as any, templateRepo as any).execute("job-1");

    expect(templateRepo.create).not.toHaveBeenCalled();
    expect(postRepo.update).toHaveBeenCalledWith("post-1", expect.objectContaining({ templateId: null }));
  });
});
