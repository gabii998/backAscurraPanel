jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igPost: { findMany: jest.fn().mockResolvedValue([]) },
    brandLearning: { findUnique: jest.fn().mockResolvedValue(null) },
    igExamplePost: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

import { GenerateIgPosts } from "../../src/application/use-cases/GenerateIgPosts";
import type { BrandRepository } from "../../src/domain/repositories/BrandRepository";
import type { IgTemplateRepository } from "../../src/domain/repositories/IgTemplateRepository";
import type { IgPostRepository } from "../../src/domain/repositories/IgPostRepository";
import type { IgBatchJobRepository } from "../../src/domain/repositories/IgBatchJobRepository";
import type { IgTemplate } from "../../src/domain/entities/IgTemplate";
import { prisma } from "../../src/infrastructure/db/prisma";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";

const brand = {
  id: "brand-1", name: "Erpy", industry: "Tecnologia", acknowledge: "", voice: "",
  colorPalette: [] as string[], typography: {}, logoUrl: "", companyContext: {}, openAiModel: "",
};

function makeTemplate(overrides: Partial<IgTemplate> = {}): IgTemplate {
  return {
    id: "tpl-1", brandId: "brand-1", name: "Template", html: "<div></div>", variables: [],
    summary: "resumen", summaryStatus: "done", summaryError: "", summaryBatchId: null, openAiKeySnapshot: null, isAiGenerated: false,
    generationStatus: "done", generationError: "", generationJobId: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function makeRepos(templates: IgTemplate[], brandOverrides: Partial<typeof brand> = {}) {
  const brandRepo: BrandRepository = {
    findById: jest.fn().mockResolvedValue({ ...brand, ...brandOverrides }),
    create: jest.fn(), findAll: jest.fn(), update: jest.fn(), delete: jest.fn(),
  };
  const templateRepo: IgTemplateRepository = {
    findByBrandId: jest.fn().mockResolvedValue(templates),
    create: jest.fn(), findById: jest.fn(), findByGenerationJobId: jest.fn(), update: jest.fn(), delete: jest.fn(),
    findPendingSummary: jest.fn(), getPerformanceSummary: jest.fn(),
  };
  const postRepo: IgPostRepository = {
    createMany: jest.fn().mockResolvedValue(0),
    create: jest.fn(), findByBrandId: jest.fn(), findByBatchJobId: jest.fn(), findById: jest.fn(), update: jest.fn(), delete: jest.fn(),
  };
  const jobRepo: IgBatchJobRepository = {
    create: jest.fn().mockImplementation(data => Promise.resolve({ id: "job-1", ...data })),
    findByBrandId: jest.fn(), findByStatus: jest.fn(), findById: jest.fn(), update: jest.fn(),
  };
  return { brandRepo, templateRepo, postRepo, jobRepo };
}

describe("GenerateIgPosts", () => {
  beforeEach(() => {
    (resolveOpenAIService as jest.Mock).mockResolvedValue({
      service: { submitBatch: jest.fn().mockResolvedValue("batch-1") },
      keySnapshot: "enc-key",
    });
    (prisma.igPost.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.brandLearning.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([]);
  });

  it("throws NO_TEMPLATES_AVAILABLE when the brand has zero ready templates — it never invents a layout", async () => {
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([]);

    await expect(
      new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 }),
    ).rejects.toThrow("NO_TEMPLATES_AVAILABLE");
  });

  it("excludes templates that are still generating or have no finished summary from selection", async () => {
    const generating = makeTemplate({ id: "tpl-generating", generationStatus: "generating", summaryStatus: "pending", summary: "" });
    const ready = makeTemplate({ id: "tpl-ready" });
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([generating, ready]);

    await new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain('"id": "tpl-ready"');
    expect(prompt).not.toContain('"id": "tpl-generating"');
  });

  it("selects the template with the most matching assetImageUrlN slots when no exact match exists", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockImplementation(({ where }) =>
      where.assetType === "style_reference" ? Promise.resolve([]) : Promise.resolve([
        { id: "asset-1", assetType: "product", title: "A", description: "", imageUrl: "https://cdn/a.png", isPrimaryLogo: false },
        { id: "asset-2", assetType: "product", title: "B", description: "", imageUrl: "https://cdn/b.png", isPrimaryLogo: false },
      ]),
    );
    const oneSlot = makeTemplate({ id: "tpl-1-slot", variables: ["assetImageUrl1"] });
    const threeSlots = makeTemplate({ id: "tpl-3-slots", variables: ["assetImageUrl1", "assetImageUrl2", "assetImageUrl3"] });
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([oneSlot, threeSlots]);

    await new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({
      brandId: "brand-1", quantity: 1, contentAssetIds: ["asset-1", "asset-2"],
    });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain('"id": "tpl-3-slots"');
    expect(prompt).not.toContain('"id": "tpl-1-slot"');
  });

  it("prefers the template with fewest over-provisioned slots when multiple templates achieve the same usable-slot count", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockImplementation(({ where }) =>
      where.assetType === "style_reference" ? Promise.resolve([]) : Promise.resolve([
        { id: "asset-1", assetType: "product", title: "A", description: "", imageUrl: "https://cdn/a.png", isPrimaryLogo: false },
      ]),
    );
    const exact = makeTemplate({ id: "tpl-exact", variables: ["assetImageUrl1"] });
    const overProvisioned = makeTemplate({ id: "tpl-over", variables: ["assetImageUrl1", "assetImageUrl2", "assetImageUrl3"] });
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([exact, overProvisioned]);

    await new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({
      brandId: "brand-1", quantity: 1, contentAssetIds: ["asset-1"],
    });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain('"id": "tpl-exact"');
    expect(prompt).not.toContain('"id": "tpl-over"');
  });

  it("never throws even when the forced template has fewer slots than the assets provided — the excess asset is simply dropped downstream", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockImplementation(({ where }) =>
      where.assetType === "style_reference" ? Promise.resolve([]) : Promise.resolve([
        { id: "asset-1", assetType: "product", title: "A", description: "", imageUrl: "https://cdn/a.png", isPrimaryLogo: false },
        { id: "asset-2", assetType: "product", title: "B", description: "", imageUrl: "https://cdn/b.png", isPrimaryLogo: false },
      ]),
    );
    const oneSlot = makeTemplate({ id: "tpl-1-slot", variables: ["assetImageUrl1"] });
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([oneSlot]);

    await expect(
      new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({
        brandId: "brand-1", quantity: 1, forceTemplateId: "tpl-1-slot", contentAssetIds: ["asset-1", "asset-2"],
      }),
    ).resolves.toBeDefined();

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain('"id": "tpl-1-slot"');
  });

  it("throws TEMPLATE_NOT_FOUND when forceTemplateId doesn't match any ready template", async () => {
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([makeTemplate({ id: "tpl-1" })]);

    await expect(
      new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({
        brandId: "brand-1", quantity: 1, forceTemplateId: "does-not-exist",
      }),
    ).rejects.toThrow("TEMPLATE_NOT_FOUND");
  });

  it("mentions {{brandLogoUrl}} as available when the brand has a logo, without dictating layout/sizing (that now lives in template generation)", async () => {
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([makeTemplate()], { logoUrl: "https://cdn/logo.png" });

    await new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({
      brandId: "brand-1", quantity: 1,
    });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("{{brandLogoUrl}}");
  });

  it("tells the model not to invent visual content from the style-reference summary", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockImplementation(({ where }) =>
      where.assetType === "style_reference"
        ? Promise.resolve([{ id: "ref-1", styleSummary: "composición: bloque de imagen superior, paleta fría." }])
        : Promise.resolve([]),
    );
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([makeTemplate()]);

    await new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({
      brandId: "brand-1", quantity: 1,
    });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("No viste la imagen real de estas referencias");
    expect(prompt).toContain("NO inventes, menciones ni representes contenido visual concreto");
  });

  it("never asks the model to author a new template's HTML — templateHtml/templateName are gone from the prompt and schema", async () => {
    const { brandRepo, templateRepo, postRepo, jobRepo } = makeRepos([makeTemplate()]);

    await new GenerateIgPosts(brandRepo, templateRepo, postRepo, jobRepo).execute({
      brandId: "brand-1", quantity: 1,
    });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).not.toContain("templateHtml");
    expect(prompt).not.toContain("templateName");
    expect(prompt).toContain('"templateId": "string"');
    expect(prompt).toContain("Nunca devuelvas templateId: null ni inventes un layout nuevo");
  });
});
