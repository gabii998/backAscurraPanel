jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    brandLearning: { findMany: jest.fn() },
  },
}));

import { CheckSynthesisBatches } from "../../src/application/use-cases/CheckSynthesisBatches";
import { prisma } from "../../src/infrastructure/db/prisma";

describe("CheckSynthesisBatches", () => {
  it("resumes checking a pending brand-learning synthesis batch with no browser involved", async () => {
    (prisma.brandLearning.findMany as jest.Mock).mockResolvedValue([
      { brandId: "brand-1", openAiBatchId: "batch-1" },
    ]);
    const checkOne = { execute: jest.fn().mockResolvedValue({ done: true, insights: "..." }) };

    await new CheckSynthesisBatches(checkOne as any).executeAll();

    expect(prisma.brandLearning.findMany).toHaveBeenCalledWith({
      where: { insightStatus: "processing", openAiBatchId: { not: null } },
      select: { brandId: true, openAiBatchId: true },
    });
    expect(checkOne.execute).toHaveBeenCalledWith("brand-1", "batch-1");
  });

  it("does not let one brand's failure stop the others", async () => {
    (prisma.brandLearning.findMany as jest.Mock).mockResolvedValue([
      { brandId: "brand-1", openAiBatchId: "batch-1" },
      { brandId: "brand-2", openAiBatchId: "batch-2" },
    ]);
    const checkOne = { execute: jest.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ done: true }) };

    await expect(new CheckSynthesisBatches(checkOne as any).executeAll()).resolves.toBeUndefined();

    expect(checkOne.execute).toHaveBeenCalledTimes(2);
    expect(checkOne.execute).toHaveBeenCalledWith("brand-2", "batch-2");
  });
});
