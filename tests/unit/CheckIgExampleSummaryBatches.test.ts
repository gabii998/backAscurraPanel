jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igExamplePost: { findMany: jest.fn(), update: jest.fn() },
    igCostLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

import { CheckIgExampleSummaryBatches } from "../../src/application/use-cases/CheckIgExampleSummaryBatches";
import { prisma } from "../../src/infrastructure/db/prisma";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";

describe("CheckIgExampleSummaryBatches", () => {
  it("stores OpenAI's real validation error in summaryError when getBatchStatus provides one", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([
      { id: "example-1", brandId: "brand-1", summaryBatchId: "batch-1" },
    ]);
    (prisma.igExamplePost.update as jest.Mock).mockResolvedValue({});
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({
        status: "failed",
        outputFileId: undefined,
        errorFileId: undefined,
        errorDetail: "invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.",
      }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckIgExampleSummaryBatches().executeAll();

    expect(prisma.igExamplePost.update).toHaveBeenCalledWith({
      where: { id: "example-1" },
      data: {
        summaryStatus: "failed",
        summaryError: "invalid_request: Cannot find file file-abc123, or organization org-xyz does not have access to it.",
      },
    });
  });

  it("switches to the retried batch id without marking the example as failed", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([
      { id: "example-1", brandId: "brand-1", summaryBatchId: "batch-1" },
    ]);
    (prisma.igExamplePost.update as jest.Mock).mockResolvedValue({});
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "validating", outputFileId: undefined, errorFileId: undefined, retriedBatchId: "batch-retry-1" }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckIgExampleSummaryBatches().executeAll();

    expect(prisma.igExamplePost.update).toHaveBeenCalledWith({
      where: { id: "example-1" },
      data: { summaryBatchId: "batch-retry-1", openAiKeySnapshot: "enc-key" },
    });
  });

  it("falls back to a generic message when getBatchStatus provides no errorDetail", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([
      { id: "example-1", brandId: "brand-1", summaryBatchId: "batch-1" },
    ]);
    (prisma.igExamplePost.update as jest.Mock).mockResolvedValue({});
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "expired", outputFileId: undefined, errorFileId: undefined }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckIgExampleSummaryBatches().executeAll();

    expect(prisma.igExamplePost.update).toHaveBeenCalledWith({
      where: { id: "example-1" },
      data: { summaryStatus: "failed", summaryError: "OpenAI batch status: expired" },
    });
  });

  it("stores a plain string summary and marks the example done", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([
      { id: "example-1", brandId: "brand-1", summaryBatchId: "batch-1" },
    ]);
    (prisma.igExamplePost.update as jest.Mock).mockResolvedValue({});
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "example-summary-example-1",
        content: JSON.stringify({ summary: "  Composición minimalista, paleta fría.  " }),
        error: undefined,
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckIgExampleSummaryBatches().executeAll();

    expect(prisma.igExamplePost.update).toHaveBeenCalledWith({
      where: { id: "example-1" },
      data: { styleSummary: "Composición minimalista, paleta fría.", summaryStatus: "done", summaryError: "" },
    });
  });

  it("flattens a structured (per-category) summary object into readable text and marks the example done", async () => {
    // Reproduces a real production response: some models (observed with gpt-5.6-luna)
    // return `summary` as an object keyed by the categories the prompt asked for,
    // instead of a single string — the old code called .trim() on that object,
    // threw, and silently marked the example as failed.
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([
      { id: "example-1", brandId: "brand-1", summaryBatchId: "batch-1" },
    ]);
    (prisma.igExamplePost.update as jest.Mock).mockResolvedValue({});
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "example-summary-example-1",
        content: JSON.stringify({ summary: { composición: "Formato vertical.", paleta: "Blanco y azul." } }),
        error: undefined,
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckIgExampleSummaryBatches().executeAll();

    expect(prisma.igExamplePost.update).toHaveBeenCalledWith({
      where: { id: "example-1" },
      data: { styleSummary: "composición: Formato vertical.\npaleta: Blanco y azul.", summaryStatus: "done", summaryError: "" },
    });
  });

  it("logs the token cost of the summary batch even though CheckIgExampleSummaryBatches previously never tracked it", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([
      { id: "example-1", brandId: "brand-1", summaryBatchId: "batch-1" },
    ]);
    (prisma.igExamplePost.update as jest.Mock).mockResolvedValue({});
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "example-summary-example-1",
        content: JSON.stringify({ summary: "Composición minimalista." }),
        error: undefined,
        usage: { promptTokens: 200, completionTokens: 80, totalTokens: 280 },
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckIgExampleSummaryBatches().executeAll();

    expect(prisma.igCostLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        brandId: "brand-1",
        operation: "example_summary",
        entityId: "example-1",
        inputTokens: 200,
        outputTokens: 80,
        totalTokens: 280,
        requestCount: 1,
      }),
    });
    expect((prisma.igCostLog.create as jest.Mock).mock.calls[0][0].data.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("executeForBrand only queries pending examples scoped to the given brand", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([]);

    await new CheckIgExampleSummaryBatches().executeForBrand("brand-1");

    expect(prisma.igExamplePost.findMany).toHaveBeenCalledWith({
      where: { brandId: "brand-1", summaryStatus: "processing", summaryBatchId: { not: null } },
    });
    expect(resolveOpenAIService).not.toHaveBeenCalled();
  });
});
