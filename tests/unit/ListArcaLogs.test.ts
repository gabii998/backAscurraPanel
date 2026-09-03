import { ListArcaLogs } from "../../src/application/use-cases/ListArcaLogs";
import type { ArcaLogRepository } from "../../src/domain/repositories/ArcaLogRepository";

const makeRepo = (overrides: Partial<ArcaLogRepository> = {}): ArcaLogRepository => ({
  create:               jest.fn(),
  list:                 jest.fn().mockResolvedValue([]),
  count:                jest.fn().mockResolvedValue(0),
  findByIdempotencyKey: jest.fn().mockResolvedValue(null),
  update:               jest.fn(),
  ...overrides,
});

describe("ListArcaLogs", () => {
  it("returns pagination envelope", async () => {
    const repo = makeRepo({ count: jest.fn().mockResolvedValue(3) });
    const result = await new ListArcaLogs(repo).execute("cfg-1");
    expect(result).toMatchObject({ data: [], total: 3, page: 1, limit: 50 });
  });

  it("defaults to page 1 and limit 50", async () => {
    const repo = makeRepo({ count: jest.fn().mockResolvedValue(0) });
    const result = await new ListArcaLogs(repo).execute("cfg-1");
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(repo.list).toHaveBeenCalledWith("cfg-1", 0, 50);
  });

  it("passes correct skip for page 2 with limit 50", async () => {
    const repo = makeRepo({ count: jest.fn().mockResolvedValue(120) });
    await new ListArcaLogs(repo).execute("cfg-1", 2, 50);
    expect(repo.list).toHaveBeenCalledWith("cfg-1", 50, 50);
  });

  it("passes correct skip for page 3 with limit 10", async () => {
    const repo = makeRepo({ count: jest.fn().mockResolvedValue(50) });
    await new ListArcaLogs(repo).execute("cfg-1", 3, 10);
    expect(repo.list).toHaveBeenCalledWith("cfg-1", 20, 10);
  });

  it("returns total from count", async () => {
    const repo = makeRepo({ count: jest.fn().mockResolvedValue(99) });
    const result = await new ListArcaLogs(repo).execute("cfg-1");
    expect(result.total).toBe(99);
  });
});
