import { RetryTemplateSummary } from "../../src/application/use-cases/RetryTemplateSummary";
import type { IgTemplate } from "../../src/domain/entities/IgTemplate";

function makeTemplate(overrides: Partial<IgTemplate> = {}): IgTemplate {
  return {
    id: "tpl-1", brandId: "brand-1", name: "Template", html: "<div>x</div>", variables: [],
    summary: "No se incluyó el HTML del template...", summaryStatus: "done", summaryError: "",
    summaryBatchId: "batch-old", openAiKeySnapshot: "key-old", isAiGenerated: true,
    generationStatus: "done", generationError: "", generationJobId: "job-1",
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe("RetryTemplateSummary", () => {
  it("throws TEMPLATE_NOT_FOUND when the template doesn't exist", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null), update: jest.fn() };
    const summarize = { execute: jest.fn() };

    await expect(new RetryTemplateSummary(repo as any, summarize as any).execute("brand-1", "tpl-1")).rejects.toThrow("TEMPLATE_NOT_FOUND");
    expect(summarize.execute).not.toHaveBeenCalled();
  });

  it("throws TEMPLATE_NOT_FOUND when the template belongs to a different brand", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(makeTemplate({ brandId: "brand-2" })), update: jest.fn() };
    const summarize = { execute: jest.fn() };

    await expect(new RetryTemplateSummary(repo as any, summarize as any).execute("brand-1", "tpl-1")).rejects.toThrow("TEMPLATE_NOT_FOUND");
  });

  it("throws TEMPLATE_NOT_READY when the template's own generation hasn't finished (no real html yet)", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(makeTemplate({ generationStatus: "generating", html: "" })), update: jest.fn() };
    const summarize = { execute: jest.fn() };

    await expect(new RetryTemplateSummary(repo as any, summarize as any).execute("brand-1", "tpl-1")).rejects.toThrow("TEMPLATE_NOT_READY");
    expect(summarize.execute).not.toHaveBeenCalled();
  });

  it("resets a stuck 'done' summary back to pending and resubmits it, regardless of its current status", async () => {
    // The manual escape hatch for the exact production bug this fixes: a template
    // summarized before its real html existed sits at summaryStatus "done" with garbage
    // text forever, since findPendingSummary() only ever picks up "pending" rows.
    const template = makeTemplate({ summaryStatus: "done", summary: "No se incluyó el HTML del template..." });
    const repo = { findById: jest.fn().mockResolvedValue(template), update: jest.fn().mockResolvedValue({}) };
    const summarize = { execute: jest.fn().mockResolvedValue({ submittedCount: 1, batchId: "batch-new" }) };

    await new RetryTemplateSummary(repo as any, summarize as any).execute("brand-1", "tpl-1");

    expect(repo.update).toHaveBeenCalledWith("tpl-1", {
      summary: "", summaryStatus: "pending", summaryError: "", summaryBatchId: null, openAiKeySnapshot: null,
    });
    expect(summarize.execute).toHaveBeenCalledWith(["tpl-1"], "brand-1");
  });
});
