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
import type { IgPostRepository } from "../../src/domain/repositories/IgPostRepository";
import type { IgBatchJobRepository } from "../../src/domain/repositories/IgBatchJobRepository";
import { prisma } from "../../src/infrastructure/db/prisma";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";

const brand = {
  id: "brand-1", name: "Erpy", industry: "Tecnologia", acknowledge: "", voice: "",
  colorPalette: [] as string[], typography: {}, logoUrl: "", companyContext: {}, openAiModel: "",
};

function makeRepos(brandOverrides: Partial<typeof brand> = {}) {
  const brandRepo: BrandRepository = {
    findById: jest.fn().mockResolvedValue({ ...brand, ...brandOverrides }),
    create: jest.fn(), findAll: jest.fn(), update: jest.fn(), delete: jest.fn(),
  };
  const postRepo: IgPostRepository = {
    createMany: jest.fn().mockResolvedValue(0),
    create: jest.fn(), findByBrandId: jest.fn(), findByBatchJobId: jest.fn(), findById: jest.fn(), update: jest.fn(), delete: jest.fn(),
  };
  const jobRepo: IgBatchJobRepository = {
    create: jest.fn().mockImplementation(data => Promise.resolve({ id: "job-1", ...data })),
    findByBrandId: jest.fn(), findByStatus: jest.fn(), findById: jest.fn(), update: jest.fn(),
  };
  return { brandRepo, postRepo, jobRepo };
}

let submitBatch: jest.Mock;

describe("GenerateIgPosts", () => {
  beforeEach(() => {
    submitBatch = jest.fn().mockResolvedValue("batch-1");
    (resolveOpenAIService as jest.Mock).mockResolvedValue({
      service: { submitBatch },
      keySnapshot: "enc-key",
    });
    (prisma.igPost.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.brandLearning.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.igExamplePost.findMany as jest.Mock).mockResolvedValue([]);
  });

  it("throws BRAND_NOT_FOUND when the brand doesn't exist", async () => {
    const { brandRepo, postRepo, jobRepo } = makeRepos();
    (brandRepo.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 }),
    ).rejects.toThrow("BRAND_NOT_FOUND");
  });

  it("throws INVALID_QUANTITY outside the 1-50 range", async () => {
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    await expect(
      new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 0 }),
    ).rejects.toThrow("INVALID_QUANTITY");
    await expect(
      new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 51 }),
    ).rejects.toThrow("INVALID_QUANTITY");
  });

  it("throws INVALID_REFERENCE_POSTS when more than 3 content assets are selected", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockImplementation(({ where }) =>
      where.assetType === "style_reference" ? Promise.resolve([]) : Promise.resolve([
        { id: "a1", assetType: "product", title: "", description: "", imageUrl: "https://cdn/a1.png", isPrimaryLogo: false },
        { id: "a2", assetType: "product", title: "", description: "", imageUrl: "https://cdn/a2.png", isPrimaryLogo: false },
        { id: "a3", assetType: "product", title: "", description: "", imageUrl: "https://cdn/a3.png", isPrimaryLogo: false },
        { id: "a4", assetType: "product", title: "", description: "", imageUrl: "https://cdn/a4.png", isPrimaryLogo: false },
      ]),
    );
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    await expect(
      new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({
        brandId: "brand-1", quantity: 1, contentAssetIds: ["a1", "a2", "a3", "a4"],
      }),
    ).rejects.toThrow("INVALID_REFERENCE_POSTS");
  });

  it("never selects/authors a template — the batch schema asks for imagePrompt instead", async () => {
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    await new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).not.toContain("templateId");
    expect(prompt).not.toContain("templateHtml");
    expect(prompt).toContain('"imagePrompt"');
  });

  it("describes selected content assets as real reference images rather than assetImageUrlN template variables", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockImplementation(({ where }) =>
      where.assetType === "style_reference" ? Promise.resolve([]) : Promise.resolve([
        { id: "asset-1", assetType: "product", title: "Zapatilla", description: "Producto estrella", imageUrl: "https://cdn/a.png", isPrimaryLogo: false },
      ]),
    );
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    await new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({
      brandId: "brand-1", quantity: 1, contentAssetIds: ["asset-1"],
    });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Zapatilla");
    expect(prompt).toContain("imágenes de referencia REALES");
    expect(prompt).not.toContain("assetImageUrl1");
  });

  it("mentions the logo as a real reference image, not a {{brandLogoUrl}} template variable", async () => {
    const { brandRepo, postRepo, jobRepo } = makeRepos({ logoUrl: "https://cdn/logo.png" });

    await new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("logo de la marca también se adjunta como imagen de referencia real");
    expect(prompt).not.toContain("{{brandLogoUrl}}");
  });

  it("tells the model not to invent visual content from the style-reference summary", async () => {
    (prisma.igExamplePost.findMany as jest.Mock).mockImplementation(({ where }) =>
      where.assetType === "style_reference"
        ? Promise.resolve([{ id: "ref-1", styleSummary: "composición: bloque de imagen superior, paleta fría." }])
        : Promise.resolve([]),
    );
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    await new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("No viste la imagen real de estas referencias");
    expect(prompt).toContain("NO inventes, menciones ni representes contenido visual concreto");
  });

  it("includes anti-cliché guidance for both copy and visuals, plus a fallback voice anchor when the brand has no approved posts yet", async () => {
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    await new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Evitá clichés de \"marketing con IA\"");
    expect(prompt).toContain("Evitá clichés visuales de \"imagen genérica de IA\"");
    expect(prompt).toContain("Cómo suena un caption bien escrito");
    expect(prompt).toContain("No hay posts aprobados todavía");
  });

  it("drops the fallback voice anchor once the brand has real approved-post history", async () => {
    (prisma.igPost.findMany as jest.Mock).mockImplementation(({ where }) =>
      where.status === "approved"
        ? Promise.resolve([{ caption: "Post real aprobado", hashtags: [], igReach: 0, igEngagement: 0, igSaved: 0, igSyncedAt: null }])
        : Promise.resolve([]),
    );
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    await new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 1 });

    const prompt = (jobRepo.create as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Evitá clichés de \"marketing con IA\"");
    expect(prompt).not.toContain("No hay posts aprobados todavía");
  });

  it("suggests a copy format and a visual treatment as overridable angles, not mandatory ones, and asks for a rationale", async () => {
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    await new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({
      brandId: "brand-1", quantity: 1, topic: "lanzamiento de producto",
    });

    const batchRequests = submitBatch.mock.calls[0][0] as Array<{ userPrompt: string }>;
    expect(batchRequests[0].userPrompt).toContain("NO es obligatorio");
    expect(batchRequests[0].userPrompt).toContain("Tratamiento visual sugerido");
    expect(batchRequests[0].userPrompt).toContain("formatRationale");
  });

  it("creates one draft post row per requested post, all attached to the batch job", async () => {
    const { brandRepo, postRepo, jobRepo } = makeRepos();

    const job = await new GenerateIgPosts(brandRepo, postRepo, jobRepo).execute({ brandId: "brand-1", quantity: 3 });

    expect(job.id).toBe("job-1");
    expect(postRepo.createMany).toHaveBeenCalledWith([
      { brandId: "brand-1", batchJobId: "job-1", caption: "", hashtags: [], status: "generating" },
      { brandId: "brand-1", batchJobId: "job-1", caption: "", hashtags: [], status: "generating" },
      { brandId: "brand-1", batchJobId: "job-1", caption: "", hashtags: [], status: "generating" },
    ]);
  });
});
