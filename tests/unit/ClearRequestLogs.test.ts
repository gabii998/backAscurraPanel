import { ClearRequestLogs } from "../../src/application/use-cases/ClearRequestLogs";
import { PrismaRequestLogRepository } from "../../src/infrastructure/repositories/PrismaRequestLogRepository";
import { prisma } from "../../src/infrastructure/db/prisma";
import type { RequestLogRepository } from "../../src/domain/repositories/RequestLogRepository";
import { buildRequestLoggerMiddleware } from "../../src/infrastructure/http/express/middleware/requestLogger";
import type { Request, Response, NextFunction } from "express";

jest.mock("../../src/infrastructure/db/prisma", () => ({ prisma: { requestLog: { deleteMany: jest.fn() } } }));

describe("ClearRequestLogs", () => {
  it("deletes exclusively requestLog records and returns the count", async () => {
    (prisma.requestLog.deleteMany as jest.Mock).mockResolvedValue({ count: 72 });
    const uc = new ClearRequestLogs(new PrismaRequestLogRepository());
    expect(await uc.execute()).toBe(72);
    expect(prisma.requestLog.deleteMany).toHaveBeenCalledWith({});
  });

  it("does not log requests to the audit endpoint", () => {
    const create = jest.fn();
    const next = jest.fn();
    const res = { on: jest.fn() };
    buildRequestLoggerMiddleware({ create } as unknown as RequestLogRepository)(
      { path: '/request-logs' } as Request, res as unknown as Response, next as NextFunction,
    );
    expect(next).toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
