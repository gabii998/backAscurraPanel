jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igExamplePost: { findMany: jest.fn(), update: jest.fn() },
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
    (resolveOpenAIService as jest.Mock).mockResolvedValue(openAI);

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
    (resolveOpenAIService as jest.Mock).mockResolvedValue(openAI);

    await new CheckIgExampleSummaryBatches().executeAll();

    expect(prisma.igExamplePost.update).toHaveBeenCalledWith({
      where: { id: "example-1" },
      data: { summaryBatchId: "batch-retry-1" },
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
    (resolveOpenAIService as jest.Mock).mockResolvedValue(openAI);

    await new CheckIgExampleSummaryBatches().executeAll();

    expect(prisma.igExamplePost.update).toHaveBeenCalledWith({
      where: { id: "example-1" },
      data: { summaryStatus: "failed", summaryError: "OpenAI batch status: expired" },
    });
  });
});
