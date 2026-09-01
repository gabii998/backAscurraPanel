import { UpdateIgTemplate } from "../../src/application/use-cases/UpdateIgTemplate";
import type { IgTemplate } from "../../src/domain/entities/IgTemplate";

function makeTemplate(overrides: Partial<IgTemplate> = {}): IgTemplate {
  return {
    id: "tpl-1", brandId: "brand-1", name: "Original", html: "<div>original</div>", variables: [],
    summary: "Resumen existente", summaryStatus: "done", summaryError: "",
    summaryBatchId: null, openAiKeySnapshot: null, isAiGenerated: false,
    generationStatus: "done", generationError: "", generationJobId: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe("UpdateIgTemplate", () => {
  it("throws TEMPLATE_NOT_FOUND when the template doesn't exist", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null), update: jest.fn() };
    await expect(new UpdateIgTemplate(repo as any).execute("tpl-1", { name: "Nuevo" })).rejects.toThrow("TEMPLATE_NOT_FOUND");
  });

  it("does NOT reset the summary on a name-only rename — the summary describes the HTML, which is untouched", async () => {
    const existing = makeTemplate();
    const repo = { findById: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue({ ...existing, name: "Nuevo nombre" }) };

    await new UpdateIgTemplate(repo as any).execute("tpl-1", { name: "Nuevo nombre" });

    expect(repo.update).toHaveBeenCalledWith("tpl-1", { name: "Nuevo nombre" });
  });

  it("does NOT reset the summary when html is passed but is identical to what's already stored", async () => {
    const existing = makeTemplate();
    const repo = { findById: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue(existing) };

    await new UpdateIgTemplate(repo as any).execute("tpl-1", { html: existing.html });

    expect(repo.update).toHaveBeenCalledWith("tpl-1", { html: existing.html });
  });

  it("resets the summary to pending when the html actually changes", async () => {
    const existing = makeTemplate();
    const repo = { findById: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue({ ...existing, html: "<div>nuevo</div>" }) };

    await new UpdateIgTemplate(repo as any).execute("tpl-1", { html: "<div>nuevo</div>" });

    expect(repo.update).toHaveBeenCalledWith("tpl-1", { html: "<div>nuevo</div>", summary: "", summaryStatus: "pending" });
  });
});
