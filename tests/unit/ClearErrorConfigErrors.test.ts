import { ClearErrorConfigErrors } from "../../src/application/use-cases/ClearErrorConfigErrors";
import type { ErrorConfigRepository } from "../../src/domain/repositories/ErrorConfigRepository";
import type { AppErrorRepository } from "../../src/domain/repositories/AppErrorRepository";
import { PrismaAppErrorRepository } from "../../src/infrastructure/repositories/PrismaAppErrorRepository";
import { prisma } from "../../src/infrastructure/db/prisma";

jest.mock("../../src/infrastructure/db/prisma", () => ({ prisma: { appError: { updateMany: jest.fn() } } }));

describe("ClearErrorConfigErrors", () => {
  const getById = jest.fn();
  const softDeleteByConfig = jest.fn();
  const uc = new ClearErrorConfigErrors(
    { getById } as unknown as ErrorConfigRepository,
    { softDeleteByConfig } as unknown as AppErrorRepository,
  );
  beforeEach(() => jest.resetAllMocks());

  it("clears only the selected configuration and returns the affected count", async () => {
    getById.mockResolvedValue({ id: "config-a" });
    softDeleteByConfig.mockResolvedValue(3);
    expect(await uc.execute("config-a")).toBe(3);
    expect(softDeleteByConfig).toHaveBeenCalledWith("config-a");
  });

  it("refuses a missing configuration without deleting errors", async () => {
    getById.mockResolvedValue(null);
    await expect(uc.execute("missing")).rejects.toThrow("ERROR_CONFIG_NOT_FOUND");
    expect(softDeleteByConfig).not.toHaveBeenCalled();
  });

  it("accepts an empty configuration", async () => {
    getById.mockResolvedValue({ id: "empty" });
    softDeleteByConfig.mockResolvedValue(0);
    expect(await uc.execute("empty")).toBe(0);
  });

  it("scopes the database update to active errors of one configuration without status filters", async () => {
    (prisma.appError.updateMany as jest.Mock).mockResolvedValue({ count: 4 });
    expect(await new PrismaAppErrorRepository().softDeleteByConfig("config-a")).toBe(4);
    expect(prisma.appError.updateMany).toHaveBeenCalledWith({
      where: { errorConfigId: "config-a", deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
