import { IngestError } from "../../src/application/use-cases/IngestError";
import type { AppErrorRepository } from "../../src/domain/repositories/AppErrorRepository";
import type { AppError } from "../../src/domain/entities/AppError";

const baseError: AppError = {
  id: "e1",
  projectId: null,
  type: "TypeError",
  message: "Cannot read x",
  severity: "error",
  status: "unresolved",
  count: 1,
  usersAffected: 1,
  stackTrace: "",
  firstSeen: new Date(),
  lastSeen: new Date(),
  metaUrl: "",
  metaBrowser: "",
  metaOs: "",
  metaUser: "ana@example.com",
  sparkline: [0, 0, 0, 0, 0, 0, 1],
  createdAt: new Date(),
  deletedAt: null,
};

const makeRepo = (overrides: Partial<AppErrorRepository> = {}): AppErrorRepository => ({
  findByFingerprint: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(null),
  list: jest.fn(),
  create: jest.fn().mockImplementation(async (e: AppError) => e),
  addOccurrence: jest.fn().mockResolvedValue(undefined),
  updateCounts: jest.fn().mockResolvedValue(undefined),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
  getSparkline: jest.fn().mockResolvedValue([0, 0, 0, 0, 0, 0, 1]),
  isUserKnown: jest.fn().mockResolvedValue(false),
  ...overrides,
});

describe("IngestError", () => {
  it("creates a new error when no fingerprint match", async () => {
    const repo = makeRepo();
    const uc = new IngestError(repo);

    const result = await uc.execute({
      type: "TypeError",
      message: "Cannot read x",
      severity: "error",
      meta: { user: "ana@example.com" },
    });

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.addOccurrence).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(1);
    expect(result.usersAffected).toBe(1);
  });

  it("sets usersAffected=0 when no user is provided on new error", async () => {
    const repo = makeRepo();
    const uc = new IngestError(repo);

    const result = await uc.execute({ type: "TypeError", message: "test" });

    expect(result.usersAffected).toBe(0);
  });

  it("increments count on duplicate, keeps usersAffected when same user", async () => {
    const updatedError = { ...baseError, count: 2, usersAffected: 1 };
    const repo = makeRepo({
      findByFingerprint: jest.fn().mockResolvedValue(baseError),
      findById: jest.fn().mockResolvedValue(updatedError),
      isUserKnown: jest.fn().mockResolvedValue(true),
    });
    const uc = new IngestError(repo);

    const result = await uc.execute({
      type: "TypeError",
      message: "Cannot read x",
      meta: { user: "ana@example.com" },
    });

    expect(repo.updateCounts).toHaveBeenCalledWith("e1", {
      count: 2,
      usersAffected: 1,
      lastSeen: expect.any(Date),
    });
    expect(result.count).toBe(2);
    expect(result.usersAffected).toBe(1);
  });

  it("increments usersAffected on duplicate with new user", async () => {
    const updatedError = { ...baseError, count: 2, usersAffected: 2 };
    const repo = makeRepo({
      findByFingerprint: jest.fn().mockResolvedValue(baseError),
      findById: jest.fn().mockResolvedValue(updatedError),
      isUserKnown: jest.fn().mockResolvedValue(false),
    });
    const uc = new IngestError(repo);

    const result = await uc.execute({
      type: "TypeError",
      message: "Cannot read x",
      meta: { user: "new-user@example.com" },
    });

    expect(repo.updateCounts).toHaveBeenCalledWith("e1", {
      count: 2,
      usersAffected: 2,
      lastSeen: expect.any(Date),
    });
    expect(result.usersAffected).toBe(2);
  });

  it("does not call isUserKnown when no userId on duplicate", async () => {
    const repo = makeRepo({
      findByFingerprint: jest.fn().mockResolvedValue(baseError),
      findById: jest.fn().mockResolvedValue({ ...baseError, count: 2 }),
    });
    const uc = new IngestError(repo);

    await uc.execute({ type: "TypeError", message: "Cannot read x" });

    expect(repo.isUserKnown).not.toHaveBeenCalled();
    expect(repo.updateCounts).toHaveBeenCalledWith("e1", expect.objectContaining({
      usersAffected: 1,
    }));
  });
});
