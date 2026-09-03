jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    brand: { findUnique: jest.fn() },
    igPost: { findMany: jest.fn() },
    brandLearning: { upsert: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock("../../src/infrastructure/services/resolveOpenAIService", () => ({
  resolveOpenAIService: jest.fn(),
}));

import { SynthesizeBrandLearning } from "../../src/application/use-cases/SynthesizeBrandLearning";
import { prisma } from "../../src/infrastructure/db/prisma";
import { resolveOpenAIService } from "../../src/infrastructure/services/resolveOpenAIService";

describe("SynthesizeBrandLearning", () => {
  beforeEach(() => {
    (prisma.brand.findUnique as jest.Mock).mockResolvedValue({ id: "brand-1", name: "Erpy" });
    (prisma.igPost.findMany as jest.Mock).mockResolvedValue([]);
    (resolveOpenAIService as jest.Mock).mockResolvedValue({
      service: { submitBatch: jest.fn().mockResolvedValue("batch-1") },
      keySnapshot: "enc-key",
    });
  });

  it("throws BRAND_NOT_FOUND when the brand doesn't exist", async () => {
    (prisma.brand.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(new SynthesizeBrandLearning().execute("brand-1")).rejects.toThrow("BRAND_NOT_FOUND");
  });

  it("excludes technical-error-tagged rejections from the rejected-posts synthesis input, keeping genuine reviewer rejections", async () => {
    (prisma.igPost.findMany as jest.Mock).mockImplementation(({ where }) => {
      if (where.status === "approved") return Promise.resolve([]);
      const all = [
        { caption: "Post con imagen rota", rejectReason: "[error de imagen] sin imagen en la respuesta" },
        { caption: "Post con error de generación", rejectReason: "[error de generación] respuesta inválida" },
        { caption: "Post rechazado por tono", rejectReason: "suena demasiado formal" },
      ];
      const excludedPrefixes = (where.NOT ?? []).map((c: { rejectReason: { startsWith: string } }) => c.rejectReason.startsWith);
      return Promise.resolve(all.filter(p => !excludedPrefixes.some((prefix: string) => p.rejectReason.startsWith(prefix))));
    });
    let capturedUserPrompt = "";
    (resolveOpenAIService as jest.Mock).mockResolvedValue({
      service: {
        submitBatch: jest.fn().mockImplementation((requests: Array<{ userPrompt: string }>) => {
          capturedUserPrompt = requests[0].userPrompt;
          return Promise.resolve("batch-1");
        }),
      },
      keySnapshot: "enc-key",
    });

    await new SynthesizeBrandLearning().execute("brand-1");

    expect(capturedUserPrompt).toContain('Motivo: "suena demasiado formal" → "Post rechazado por tono"');
    expect(capturedUserPrompt).not.toContain("[error de imagen]");
    expect(capturedUserPrompt).not.toContain("[error de generación]");
  });
});
