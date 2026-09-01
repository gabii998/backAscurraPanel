jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igTemplate: { updateMany: jest.fn().mockResolvedValue({}) },
    igCostLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

import { CheckTemplateSummaryBatch } from "../../src/application/use-cases/CheckTemplateSummaryBatch";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";
import { prisma } from "../../src/infrastructure/db/prisma";

describe("CheckTemplateSummaryBatch", () => {
  it("rewrites summaryBatchId on every template sharing the old batch id when OpenAI recreates the batch", async () => {
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "validating", retriedBatchId: "batch-retry-1" }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });
    const templateRepo = { update: jest.fn() };

    const result = await new CheckTemplateSummaryBatch(templateRepo as any).execute("batch-1", "brand-1");

    expect(prisma.igTemplate.updateMany).toHaveBeenCalledWith({
      where: { summaryBatchId: "batch-1" },
      data: { summaryBatchId: "batch-retry-1", openAiKeySnapshot: "enc-key" },
    });
    expect(result).toEqual({ updatedCount: 0 });
  });

  it("marks every template sharing the batch id as failed when the OpenAI batch itself fails", async () => {
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "expired", outputFileId: undefined, errorFileId: undefined }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });
    const templateRepo = { update: jest.fn() };

    await new CheckTemplateSummaryBatch(templateRepo as any).execute("batch-1", "brand-1");

    expect(prisma.igTemplate.updateMany).toHaveBeenCalledWith({
      where: { summaryBatchId: "batch-1" },
      data: { summaryStatus: "failed", summaryError: "OpenAI batch status: expired" },
    });
  });

  it("on completion, updates each matched template's summary via the repository", async () => {
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "summary-tpl-1",
        content: "Diseño moderno con fondo azul.",
        error: undefined,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });
    const templateRepo = { update: jest.fn().mockResolvedValue({}) };

    const result = await new CheckTemplateSummaryBatch(templateRepo as any).execute("batch-1", "brand-1");

    expect(templateRepo.update).toHaveBeenCalledWith("tpl-1", { summary: "Diseño moderno con fondo azul.", summaryStatus: "done" });
    expect(result).toEqual({ updatedCount: 1 });
  });
});
