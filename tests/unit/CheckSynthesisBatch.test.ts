jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    brandLearning: { updateMany: jest.fn(), findUnique: jest.fn().mockResolvedValue({ openAiKeySnapshot: null }) },
    igCostLog:     { create: jest.fn() },
  },
}));

jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

import { CheckSynthesisBatch } from "../../src/application/use-cases/CheckSynthesisBatch";
import { prisma } from "../../src/infrastructure/db/prisma";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";

describe("CheckSynthesisBatch", () => {
  it("detects a per-line OpenAI validation error even when it only appears in error_file_id, not output_file_id", async () => {
    // Reproduces the real production bug: response_format: json_object was forced on a
    // plain-text synthesis prompt, so OpenAI rejected every line and wrote the failure to
    // the *error* file. The old code only ever read outputFileId, so this was invisible.
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: undefined, errorFileId: "file-err" }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "synthesis-brand-1",
        content: "",
        error: "'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.",
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });
    (prisma.brandLearning.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await new CheckSynthesisBatch().execute("brand-1", "batch-1");

    expect(result).toEqual({ done: false });
    expect(openAI.downloadBatchResults).toHaveBeenCalledWith("file-err");
    expect(prisma.brandLearning.updateMany).toHaveBeenCalledWith({
      where: { brandId: "brand-1", openAiBatchId: "batch-1" },
      data: { insightStatus: "pending" },
    });
  });

  it("does not query files or throw when neither output nor error file exists yet", async () => {
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "in_progress", outputFileId: undefined, errorFileId: undefined }),
      downloadBatchResults: jest.fn(),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    const result = await new CheckSynthesisBatch().execute("brand-1", "batch-1");

    expect(result).toEqual({ done: false });
    expect(openAI.downloadBatchResults).not.toHaveBeenCalled();
  });

  it("persists trimmed insights and marks insightStatus done on a genuine successful result", async () => {
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "synthesis-brand-1",
        content: "  Los posts con datos concretos generan más guardados.  ",
        error: undefined,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });
    (prisma.brandLearning.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.igCostLog.create as jest.Mock).mockResolvedValue({});

    const result = await new CheckSynthesisBatch().execute("brand-1", "batch-1");

    expect(result).toEqual({ done: true, insights: "Los posts con datos concretos generan más guardados." });
    expect(prisma.brandLearning.updateMany).toHaveBeenCalledWith({
      where: { brandId: "brand-1", openAiBatchId: "batch-1" },
      data: {
        insights: "Los posts con datos concretos generan más guardados.",
        insightStatus: "done",
        lastSynthAt: expect.any(Date),
      },
    });
  });

  it("resets insightStatus to pending on batch-level failure (failed/expired/cancelled)", async () => {
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "expired", outputFileId: undefined, errorFileId: undefined }),
      downloadBatchResults: jest.fn(),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });
    (prisma.brandLearning.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await new CheckSynthesisBatch().execute("brand-1", "batch-1");

    expect(result).toEqual({ done: false });
    expect(prisma.brandLearning.updateMany).toHaveBeenCalledWith({
      where: { brandId: "brand-1", openAiBatchId: "batch-1" },
      data: { insightStatus: "pending", insightError: "OpenAI batch status: expired" },
    });
  });

  it("switches to the retried batch id without resetting insightStatus when getBatchStatus recreates the batch", async () => {
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "validating", outputFileId: undefined, errorFileId: undefined, retriedBatchId: "batch-retry-1" }),
      downloadBatchResults: jest.fn(),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });
    (prisma.brandLearning.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await new CheckSynthesisBatch().execute("brand-1", "batch-1");

    expect(result).toEqual({ done: false });
    expect(prisma.brandLearning.updateMany).toHaveBeenCalledWith({
      where: { brandId: "brand-1", openAiBatchId: "batch-1" },
      data: { openAiBatchId: "batch-retry-1", openAiKeySnapshot: "enc-key" },
    });
  });

  it("persists OpenAI's real validation error in insightError when getBatchStatus provides one", async () => {
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({
        status: "failed",
        outputFileId: undefined,
        errorFileId: undefined,
        errorDetail: "invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.",
      }),
      downloadBatchResults: jest.fn(),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });
    (prisma.brandLearning.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await new CheckSynthesisBatch().execute("brand-1", "batch-1");

    expect(result).toEqual({ done: false });
    expect(prisma.brandLearning.updateMany).toHaveBeenCalledWith({
      where: { brandId: "brand-1", openAiBatchId: "batch-1" },
      data: {
        insightStatus: "pending",
        insightError: "invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.",
      },
    });
  });
});
