jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igCostLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

import { CheckTemplateGenerationJob } from "../../src/application/use-cases/CheckTemplateGenerationJob";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";
import type { IgTemplateGenerationJob } from "../../src/domain/entities/IgTemplateGenerationJob";
import type { IgTemplate } from "../../src/domain/entities/IgTemplate";

function baseJob(overrides: Partial<IgTemplateGenerationJob> = {}): IgTemplateGenerationJob {
  return {
    id: "job-1",
    brandId: "brand-1",
    openAiBatchId: "batch-1",
    openAiKeySnapshot: null,
    prompt: "",
    styleDirection: "",
    status: "processing",
    templateCount: 1,
    errorMessage: "",
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function baseStub(overrides: Partial<IgTemplate> = {}): IgTemplate {
  return {
    id: "tpl-stub-1", brandId: "brand-1", name: "Generando…", html: "", variables: [],
    summary: "", summaryStatus: "pending", summaryError: "", summaryBatchId: null, openAiKeySnapshot: null, isAiGenerated: true,
    generationStatus: "generating", generationError: "", generationJobId: "job-1",
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe("CheckTemplateGenerationJob", () => {
  it("switches to the retried batch id and keeps status processing when getBatchStatus recreates the batch", async () => {
    const job = baseJob();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, openAiBatchId: "batch-retry-1", status: "processing" }) };
    const templateRepo = { findByGenerationJobId: jest.fn(), update: jest.fn() };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "validating", outputFileId: undefined, errorFileId: undefined, retriedBatchId: "batch-retry-1" }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckTemplateGenerationJob(jobRepo as any, templateRepo as any).execute("job-1");

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", { openAiBatchId: "batch-retry-1", openAiKeySnapshot: "enc-key", status: "processing" });
  });

  it("marks the job and its stub templates as failed when the OpenAI batch fails", async () => {
    const job = baseJob();
    const stub = baseStub();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "failed" }) };
    const templateRepo = { findByGenerationJobId: jest.fn().mockResolvedValue([stub]), update: jest.fn() };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "failed", outputFileId: undefined, errorFileId: undefined, errorDetail: "boom" }),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckTemplateGenerationJob(jobRepo as any, templateRepo as any).execute("job-1");

    expect(templateRepo.update).toHaveBeenCalledWith("tpl-stub-1", { generationStatus: "failed", generationError: "boom" });
    expect(jobRepo.update).toHaveBeenCalledWith("job-1", { status: "failed", errorMessage: "boom" });
  });

  it("on completion, fills in html/variables/name per stub and derives variables from the HTML instead of trusting the model's own list", async () => {
    const job = baseJob();
    const stub = baseStub();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const templateRepo = { findByGenerationJobId: jest.fn().mockResolvedValue([stub]), update: jest.fn().mockResolvedValue(stub) };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "template-0",
        content: JSON.stringify({ name: "Promo cuadrada", html: "<div>{{headline}}<img src=\"{{assetImageUrl1}}\"></div>" }),
        error: undefined,
        usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    const result = await new CheckTemplateGenerationJob(jobRepo as any, templateRepo as any).execute("job-1");

    expect(templateRepo.update).toHaveBeenCalledWith("tpl-stub-1", expect.objectContaining({
      name: "Promo cuadrada",
      generationStatus: "done",
      variables: expect.arrayContaining(["headline", "assetImageUrl1"]),
    }));
    expect(result.generatedTemplateIds).toEqual(["tpl-stub-1"]);
  });

  it("marks an individual stub as failed (without failing the whole job) when its own result carries an error", async () => {
    const job = baseJob();
    const stub = baseStub();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const templateRepo = { findByGenerationJobId: jest.fn().mockResolvedValue([stub]), update: jest.fn().mockResolvedValue(stub) };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: undefined, errorFileId: "file-err" }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "template-0",
        content: "",
        error: "content_policy_violation",
        usage: undefined,
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    const result = await new CheckTemplateGenerationJob(jobRepo as any, templateRepo as any).execute("job-1");

    expect(templateRepo.update).toHaveBeenCalledWith("tpl-stub-1", { generationStatus: "failed", generationError: "content_policy_violation" });
    expect(result.generatedTemplateIds).toEqual([]);
  });

  it("logs a template_generation cost entry on completion", async () => {
    const { prisma } = require("../../src/infrastructure/db/prisma");
    const job = baseJob();
    const stub = baseStub();
    const jobRepo = { findById: jest.fn().mockResolvedValue(job), update: jest.fn().mockResolvedValue({ ...job, status: "completed" }) };
    const templateRepo = { findByGenerationJobId: jest.fn().mockResolvedValue([stub]), update: jest.fn().mockResolvedValue(stub) };
    const openAI = {
      getBatchStatus: jest.fn().mockResolvedValue({ status: "completed", outputFileId: "file-out", errorFileId: undefined }),
      downloadBatchResults: jest.fn().mockResolvedValue([{
        customId: "template-0",
        content: JSON.stringify({ name: "Promo", html: "<div>{{headline}}</div>" }),
        error: undefined,
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      }]),
    };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "enc-key" });

    await new CheckTemplateGenerationJob(jobRepo as any, templateRepo as any).execute("job-1");

    expect(prisma.igCostLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ operation: "template_generation", brandId: "brand-1" }),
    }));
  });
});
