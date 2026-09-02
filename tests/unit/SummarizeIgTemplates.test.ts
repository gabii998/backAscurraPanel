jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

import { SummarizeIgTemplates } from "../../src/application/use-cases/SummarizeIgTemplates";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";
import type { IgTemplate } from "../../src/domain/entities/IgTemplate";

function makeTemplate(overrides: Partial<IgTemplate> = {}): IgTemplate {
  return {
    id: "tpl-1", brandId: "brand-1", name: "Template", html: "<div>x</div>", variables: [],
    summary: "", summaryStatus: "pending", summaryError: "",
    summaryBatchId: null, openAiKeySnapshot: null, isAiGenerated: false,
    generationStatus: "done", generationError: "", generationJobId: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe("SummarizeIgTemplates", () => {
  it("returns zero when there are no pending templates", async () => {
    const repo = { findPendingSummary: jest.fn().mockResolvedValue([]), update: jest.fn() };

    const result = await new SummarizeIgTemplates(repo as any).execute();

    expect(result).toEqual({ submittedCount: 0, batchId: null });
    expect(resolveOpenAIService).not.toHaveBeenCalled();
  });

  it("submits a single batch when every pending template belongs to the same brand", async () => {
    const templates = [makeTemplate({ id: "tpl-1", brandId: "brand-1" }), makeTemplate({ id: "tpl-2", brandId: "brand-1" })];
    const repo = { findPendingSummary: jest.fn().mockResolvedValue(templates), update: jest.fn().mockResolvedValue({}) };
    const openAI = { submitBatch: jest.fn().mockResolvedValue("batch-1") };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "key-1" });

    const result = await new SummarizeIgTemplates(repo as any).execute();

    expect(resolveOpenAIService).toHaveBeenCalledTimes(1);
    expect(openAI.submitBatch).toHaveBeenCalledTimes(1);
    expect(openAI.submitBatch).toHaveBeenCalledWith([
      expect.objectContaining({ customId: "summary-tpl-1" }),
      expect.objectContaining({ customId: "summary-tpl-2" }),
    ]);
    expect(result).toEqual({ submittedCount: 2, batchId: "batch-1" });
  });

  it("submits one batch per brand, each resolved against its own brand's OpenAI key, when pending templates span multiple brands", async () => {
    // Reproduces a real gap: findPendingSummary() is unscoped by brand, and a caller with no
    // templateIds/brandId (e.g. a cron sweep catching submissions the frontend's fire-and-forget
    // trigger never completed) could pull in several brands' pending templates at once. Before
    // this fix, everything got submitted under whichever brand happened to be first — silently
    // billing/analyzing other brands' templates against the wrong brand's key.
    const templates = [
      makeTemplate({ id: "tpl-1", brandId: "brand-1" }),
      makeTemplate({ id: "tpl-2", brandId: "brand-2" }),
      makeTemplate({ id: "tpl-3", brandId: "brand-1" }),
    ];
    const repo = { findPendingSummary: jest.fn().mockResolvedValue(templates), update: jest.fn().mockResolvedValue({}) };
    const openAI1 = { submitBatch: jest.fn().mockResolvedValue("batch-brand-1") };
    const openAI2 = { submitBatch: jest.fn().mockResolvedValue("batch-brand-2") };
    (resolveOpenAIService as jest.Mock).mockImplementation((brandId: string) =>
      Promise.resolve(brandId === "brand-1" ? { service: openAI1, keySnapshot: "key-1" } : { service: openAI2, keySnapshot: "key-2" }),
    );

    const result = await new SummarizeIgTemplates(repo as any).execute();

    expect(resolveOpenAIService).toHaveBeenCalledWith("brand-1");
    expect(resolveOpenAIService).toHaveBeenCalledWith("brand-2");
    expect(openAI1.submitBatch).toHaveBeenCalledWith([
      expect.objectContaining({ customId: "summary-tpl-1" }),
      expect.objectContaining({ customId: "summary-tpl-3" }),
    ]);
    expect(openAI2.submitBatch).toHaveBeenCalledWith([expect.objectContaining({ customId: "summary-tpl-2" })]);
    expect(repo.update).toHaveBeenCalledWith("tpl-1", { summaryStatus: "processing", summaryBatchId: "batch-brand-1", openAiKeySnapshot: "key-1" });
    expect(repo.update).toHaveBeenCalledWith("tpl-2", { summaryStatus: "processing", summaryBatchId: "batch-brand-2", openAiKeySnapshot: "key-2" });
    expect(repo.update).toHaveBeenCalledWith("tpl-3", { summaryStatus: "processing", summaryBatchId: "batch-brand-1", openAiKeySnapshot: "key-1" });
    expect(result.submittedCount).toBe(3);
  });

  it("isolates a failure on one brand so other brands' pending templates still get submitted", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const templates = [makeTemplate({ id: "tpl-1", brandId: "brand-broken" }), makeTemplate({ id: "tpl-2", brandId: "brand-ok" })];
    const repo = { findPendingSummary: jest.fn().mockResolvedValue(templates), update: jest.fn().mockResolvedValue({}) };
    const openAIOk = { submitBatch: jest.fn().mockResolvedValue("batch-ok") };
    (resolveOpenAIService as jest.Mock).mockImplementation((brandId: string) =>
      brandId === "brand-broken"
        ? Promise.reject(new Error("BRAND_OPENAI_KEY_NOT_CONFIGURED"))
        : Promise.resolve({ service: openAIOk, keySnapshot: "key-ok" }),
    );

    const result = await new SummarizeIgTemplates(repo as any).execute();

    expect(openAIOk.submitBatch).toHaveBeenCalledWith([expect.objectContaining({ customId: "summary-tpl-2" })]);
    expect(repo.update).toHaveBeenCalledWith("tpl-2", { summaryStatus: "processing", summaryBatchId: "batch-ok", openAiKeySnapshot: "key-ok" });
    expect(repo.update).not.toHaveBeenCalledWith("tpl-1", expect.anything());
    expect(result).toEqual({ submittedCount: 1, batchId: "batch-ok" });
    (console.error as jest.Mock).mockRestore();
  });

  it("filters to a single brand's pending templates when brandId is given with no templateIds", async () => {
    const templates = [makeTemplate({ id: "tpl-1", brandId: "brand-1" }), makeTemplate({ id: "tpl-2", brandId: "brand-2" })];
    const repo = { findPendingSummary: jest.fn().mockResolvedValue(templates), update: jest.fn().mockResolvedValue({}) };
    const openAI = { submitBatch: jest.fn().mockResolvedValue("batch-1") };
    (resolveOpenAIService as jest.Mock).mockResolvedValue({ service: openAI, keySnapshot: "key-1" });

    const result = await new SummarizeIgTemplates(repo as any).execute(undefined, "brand-1");

    expect(openAI.submitBatch).toHaveBeenCalledWith([expect.objectContaining({ customId: "summary-tpl-1" })]);
    expect(result.submittedCount).toBe(1);
  });
});
