jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igExamplePost: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

import { GenerateIgTemplates } from "../../src/application/use-cases/GenerateIgTemplates";
import type { BrandRepository } from "../../src/domain/repositories/BrandRepository";
import type { IgTemplateRepository } from "../../src/domain/repositories/IgTemplateRepository";
import type { IgTemplateGenerationJobRepository } from "../../src/domain/repositories/IgTemplateGenerationJobRepository";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";
import { prisma } from "../../src/infrastructure/db/prisma";

const brand = {
  id: "brand-1", name: "Erpy", industry: "Tecnologia", acknowledge: "", voice: "",
  colorPalette: [] as string[], typography: {}, logoUrl: "", companyContext: {}, openAiModel: "",
};

function makeRepos(brandOverrides: Partial<typeof brand> = {}) {
  const brandRepo: BrandRepository = {
    findById: jest.fn().mockResolvedValue({ ...brand, ...brandOverrides }),
    create: jest.fn(), findAll: jest.fn(), update: jest.fn(), delete: jest.fn(),
  };
  const templateRepo: IgTemplateRepository = {
    create: jest.fn().mockImplementation(data => Promise.resolve({ id: `tpl-${Math.random()}`, ...data })),
    findByBrandId: jest.fn(), findById: jest.fn(), findByGenerationJobId: jest.fn(),
    update: jest.fn(), delete: jest.fn(), findPendingSummary: jest.fn(),
    getPerformanceSummary: jest.fn(),
  };
  const jobRepo: IgTemplateGenerationJobRepository = {
    create: jest.fn().mockImplementation(data => Promise.resolve({ id: "job-1", ...data })),
    findByBrandId: jest.fn(), findByStatus: jest.fn(), findById: jest.fn(), update: jest.fn(),
  };
  return { brandRepo, templateRepo, jobRepo };
}

let submitBatch: jest.Mock;

describe("GenerateIgTemplates", () => {
  beforeEach(() => {
    submitBatch = jest.fn().mockResolvedValue("batch-1");
    (resolveOpenAIService as jest.Mock).mockResolvedValue({
      service: { submitBatch },
      keySnapshot: "enc-key",
    });
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.igExamplePost.count as jest.Mock).mockResolvedValue(0);
  });

  it("rejects a quantity outside 1-8", async () => {
    const { brandRepo, templateRepo, jobRepo } = makeRepos();
    await expect(
      new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 0 }),
    ).rejects.toThrow("INVALID_QUANTITY");
    await expect(
      new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 9 }),
    ).rejects.toThrow("INVALID_QUANTITY");
  });

  it("creates one 'generating' stub IgTemplate per requested quantity, linked to the new job", async () => {
    const { brandRepo, templateRepo, jobRepo } = makeRepos();

    const job = await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 3 });

    expect(templateRepo.create).toHaveBeenCalledTimes(3);
    for (const call of (templateRepo.create as jest.Mock).mock.calls) {
      expect(call[0]).toMatchObject({ brandId: "brand-1", generationStatus: "generating", generationJobId: job.id, html: "" });
    }
    expect((jobRepo.create as jest.Mock).mock.calls[0][0]).toMatchObject({ templateCount: 3, status: "processing" });
  });

  it("cycles the requested asset-slot count across per-request user prompts, up to what the brand's asset supply supports", async () => {
    (prisma.igExamplePost.count as jest.Mock).mockResolvedValue(10); // plenty of content-asset photography
    const { brandRepo, templateRepo, jobRepo } = makeRepos();

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 5 });

    const submitted = submitBatch.mock.calls[0][0] as Array<{ userPrompt: string }>;
    expect(submitted[0].userPrompt).toContain("NO debe incluir ningún placeholder");
    expect(submitted[1].userPrompt).toContain("{{assetImageUrl1}}");
    expect(submitted[2].userPrompt).toContain("{{assetImageUrl1}}");
    expect(submitted[2].userPrompt).toContain("{{assetImageUrl2}}");
    expect(submitted[3].userPrompt).toContain("{{assetImageUrl3}}");
    expect(submitted[4].userPrompt).toContain("NO debe incluir ningún placeholder");
  });

  it("caps requested image slots to the brand's actual content-asset supply, instead of forcing collage layouts with nothing to fill them", async () => {
    (prisma.igExamplePost.count as jest.Mock).mockResolvedValue(0); // no product/screenshot/brand-asset photography at all
    const { brandRepo, templateRepo, jobRepo } = makeRepos();

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 5 });

    const submitted = submitBatch.mock.calls[0][0] as Array<{ userPrompt: string }>;
    // With zero assets available, the max slot count is capped at 1 — indices 2 and 3
    // (which would otherwise request 2 and 3 slots) fall back to at most 1.
    expect(submitted[2].userPrompt).not.toContain("{{assetImageUrl2}}");
    expect(submitted[3].userPrompt).not.toContain("{{assetImageUrl2}}");
    expect(submitted[3].userPrompt).not.toContain("{{assetImageUrl3}}");
  });

  it("suggests a layout archetype as an overridable idea, not a mandatory one, and asks for a rationale", async () => {
    const { brandRepo, templateRepo, jobRepo } = makeRepos();

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const submitted = submitBatch.mock.calls[0][0] as Array<{ userPrompt: string }>;
    expect(submitted[0].userPrompt).toContain("NO es obligatorio");
    expect(submitted[0].userPrompt).toContain("archetypeRationale");
  });

  it("wires uploaded style-reference summaries into the template-generation prompt, and derives a fallback palette from their hex mentions when the brand has no explicit colorPalette", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([
      { styleSummary: "Paleta aproximada: #123456, #abcdef. Layout: imagen destacada + texto." },
      { styleSummary: "Paleta aproximada: #123456, #abcdef. Layout: imagen destacada + texto, variante 2." },
    ]);
    const { brandRepo, templateRepo, jobRepo } = makeRepos();

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Referencias de estilo visual subidas por la marca");
    expect(prompt).toContain("imagen destacada + texto");
    expect(prompt).toContain("paleta aproximada, inferida automáticamente");
    expect(prompt).toContain("#123456");
    expect(prompt).toContain("#abcdef");
  });

  it("lets an explicitly configured colorPalette win over any palette inferred from style references", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([
      { styleSummary: "Paleta aproximada: #000000, #ffffff." },
    ]);
    const { brandRepo, templateRepo, jobRepo } = makeRepos({ colorPalette: ["#155EEF"] });

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Usá EXCLUSIVAMENTE los colores de la paleta de marca");
    expect(prompt).not.toContain("paleta aproximada, inferida automáticamente");
  });

  it("includes numeric design rules, the gold-standard example, and the brand's company context in the prompt", async () => {
    const { brandRepo, templateRepo, jobRepo } = makeRepos({
      companyContext: { contentPillars: "tips de uso, novedades del producto" },
    });

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Reglas numéricas de diseño");
    expect(prompt).toContain("múltiplos de 8px");
    expect(prompt).toContain("Ejemplo de referencia");
    expect(prompt).toContain("contentPillars: tips de uso, novedades del producto");
  });

  it("includes palette/typography/logo/contrast rules in the system prompt", async () => {
    const { brandRepo, templateRepo, jobRepo } = makeRepos({ colorPalette: ["#155EEF", "#111827"], logoUrl: "https://cdn/logo.png" });

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Usá EXCLUSIVAMENTE los colores de la paleta de marca");
    expect(prompt).toContain("#155EEF");
    expect(prompt).toContain("object-fit: contain");
    expect(prompt).toContain("prominente y legible");
    expect(prompt).toContain("Contraste");
  });

  it("tells the model not to wrap the logo in a background card/box — the logo file is already self-contained", async () => {
    const { brandRepo, templateRepo, jobRepo } = makeRepos({ logoUrl: "https://cdn/logo.png" });

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("NO le agregues una tarjeta, card ni fondo de color");
    expect(prompt).toContain("SIN ninguna tarjeta/fondo de color agregado detrás");
  });

  it("throws MISSING_BASE_TEMPLATE when mode is iterate without a baseTemplateId", async () => {
    const { brandRepo, templateRepo, jobRepo } = makeRepos();
    await expect(
      new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1, mode: "iterate" }),
    ).rejects.toThrow("MISSING_BASE_TEMPLATE");
  });

  it("in iterate mode, pulls performance data and routes template-fit rejection reasons into the prompt", async () => {
    const { brandRepo, templateRepo, jobRepo } = makeRepos();
    (templateRepo.findById as jest.Mock).mockResolvedValue({
      id: "tpl-1", brandId: "brand-1", name: "Base", html: "<div>base</div>", variables: [],
      summary: "", summaryStatus: "done", summaryError: "", summaryBatchId: null, openAiKeySnapshot: null, isAiGenerated: true,
      generationStatus: "done", generationError: "", generationJobId: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    (templateRepo.getPerformanceSummary as jest.Mock).mockResolvedValue({
      approvedCount: 2, rejectedCount: 3, avgEngagement: 10,
      mismatchReasons: ["el layout no tiene lugar para textos largos"],
    });

    await new GenerateIgTemplates(brandRepo, templateRepo, jobRepo).execute({
      brandId: "brand-1", quantity: 1, mode: "iterate", baseTemplateId: "tpl-1",
    });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Rendimiento de este template");
    expect(prompt).toContain("el layout no tiene lugar para textos largos");
    expect(prompt).toContain("<div>base</div>");
  });
});
