jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

import { CheckBatchStatus } from "../../src/application/use-cases/CheckBatchStatus";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";
import type { IgBatchJob } from "../../src/domain/entities/IgBatchJob";

function baseJob(overrides: Partial<IgBatchJob> = {}): IgBatchJob {
  return {
    id: "job-1",
    brandId: "brand-1",
    openAiBatchId: "batch-1",
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
    (resolveOpenAIService as jest.Mock).mockResolvedValue(openAI);

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
    (resolveOpenAIService as jest.Mock).mockResolvedValue(openAI);

    await new CheckBatchStatus(jobRepo as any, postRepo as any, templateRepo as any).execute("job-1");

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", { openAiBatchId: "batch-retry-1", status: "processing" });
  });

  it("falls back to a generic message when getBatchStatus provides no errorDetail", async () => {
    const job = baseJob();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "failed" }) };
    const postRepo = { findByBatchJobId: jest.fn() };
    const templateRepo = {};
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "expired", outputFileId: undefined, errorFileId: undefined }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue(openAI);

    await new CheckBatchStatus(jobRepo as any, postRepo as any, templateRepo as any).execute("job-1");

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", {
      status: "failed",
      errorMessage: "OpenAI batch status: expired",
    });
  });
});
