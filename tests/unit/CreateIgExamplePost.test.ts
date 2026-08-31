jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igExamplePost: {
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brand: { update: jest.fn() },
  },
}));

jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

import { CreateIgExamplePost } from "../../src/application/use-cases/CreateIgExamplePost";
import type { BrandRepository } from "../../src/domain/repositories/BrandRepository";
import { prisma } from "../../src/infrastructure/db/prisma";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";

const example = {
  id: "example-1", brandId: "brand-1", imageUrl: "", objectKey: "", fileName: "", mimeType: "", fileSize: 0,
  caption: "", assetType: "style_reference", title: "", description: "", notes: "", isPrimaryLogo: false,
  styleSummary: "", summaryStatus: "pending", summaryBatchId: null, summaryError: "", createdAt: new Date(), updatedAt: new Date(),
};

const brandRepo: BrandRepository = {
  findById: jest.fn().mockResolvedValue({ id: "brand-1" }),
  create: jest.fn(), findAll: jest.fn(), update: jest.fn(), delete: jest.fn(),
};

describe("CreateIgExamplePost", () => {
  beforeEach(() => {
    (prisma.igExamplePost.create as jest.Mock).mockResolvedValue(example);
    (prisma.igExamplePost.update as jest.Mock).mockImplementation(({ data }) => Promise.resolve({ ...example, ...data }));
  });

  it("keeps an uploaded style reference when OpenAI cannot start its analysis", async () => {
    const storage = { put: jest.fn().mockResolvedValue("https://cdn.example/reference.webp"), delete: jest.fn() };
    (resolveOpenAIService as jest.Mock).mockRejectedValue(new Error("OPENAI_UNAVAILABLE"));
    const useCase = new CreateIgExamplePost(brandRepo, storage as never);

    const result = await useCase.execute({
      brandId: "brand-1", assetType: "style_reference",
      file: { buffer: Buffer.from("image"), originalname: "reference.webp", mimetype: "image/webp", size: 5 },
    });

    expect(result.summaryStatus).toBe("failed");
    expect(result.summaryError).toBe("STYLE_ANALYSIS_UNAVAILABLE");
    expect(prisma.igExamplePost.delete).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
