jest.mock("../../src/infrastructure/db/prisma", () => ({
  prisma: {
    igTemplate: { findMany: jest.fn() },
  },
}));

import { CheckTemplateSummaryBatches } from "../../src/application/use-cases/CheckTemplateSummaryBatches";
import { prisma } from "../../src/infrastructure/db/prisma";

describe("CheckTemplateSummaryBatches", () => {
  it("resumes checking a pending template summary batch even if nothing in the frontend remembers its batch id", async () => {
    (prisma.igTemplate.findMany as jest.Mock).mockResolvedValue([
      { brandId: "brand-1", summaryBatchId: "batch-1" },
    ]);
    const checkOne = { execute: jest.fn().mockResolvedValue({ updatedCount: 1 }) };

    await new CheckTemplateSummaryBatches(checkOne as any).executeForBrand("brand-1");

    expect(prisma.igTemplate.findMany).toHaveBeenCalledWith({
      where: { brandId: "brand-1", summaryStatus: "processing", summaryBatchId: { not: null } },
      select: { brandId: true, summaryBatchId: true },
    });
    expect(checkOne.execute).toHaveBeenCalledWith("batch-1", "brand-1");
  });

  it("checks each distinct batch id only once even when many templates share the same batch", async () => {
    (prisma.igTemplate.findMany as jest.Mock).mockResolvedValue([
      { brandId: "brand-1", summaryBatchId: "batch-1" },
      { brandId: "brand-1", summaryBatchId: "batch-1" },
      { brandId: "brand-1", summaryBatchId: "batch-2" },
    ]);
    const checkOne = { execute: jest.fn().mockResolvedValue({ updatedCount: 1 }) };

    await new CheckTemplateSummaryBatches(checkOne as any).executeAll();

    expect(checkOne.execute).toHaveBeenCalledTimes(2);
    expect(checkOne.execute).toHaveBeenCalledWith("batch-1", "brand-1");
    expect(checkOne.execute).toHaveBeenCalledWith("batch-2", "brand-1");
  });

  it("skips templates with no summaryBatchId and does not let one batch's failure stop the others", async () => {
    (prisma.igTemplate.findMany as jest.Mock).mockResolvedValue([
      { brandId: "brand-1", summaryBatchId: null },
      { brandId: "brand-1", summaryBatchId: "batch-1" },
    ]);
    const checkOne = { execute: jest.fn().mockRejectedValue(new Error("boom")) };

    await expect(new CheckTemplateSummaryBatches(checkOne as any).executeAll()).resolves.toBeUndefined();

    expect(checkOne.execute).toHaveBeenCalledTimes(1);
    expect(checkOne.execute).toHaveBeenCalledWith("batch-1", "brand-1");
  });
});
