jest.mock("fs", () => ({
  promises: { rm: jest.fn() },
}));

const loginMock = jest.fn();
const storageMock = jest.fn();

jest.mock("@arcasdk/core", () => ({
  ArcaServiceNames: { WSFE: "wsfe" },
  AuthRepository: jest.fn().mockImplementation(() => ({ login: loginMock })),
  FileSystemTicketStorage: jest.fn().mockImplementation((config) => {
    storageMock(config);
    return {};
  }),
}));

import { promises as fs } from "fs";
import path from "path";
import { RefreshArcaTicket } from "../../src/application/use-cases/RefreshArcaTicket";
import type { ArcaConfigRepository } from "../../src/domain/repositories/ArcaConfigRepository";
import type { ArcaConfig } from "../../src/domain/entities/ArcaConfig";

const config: ArcaConfig = {
  id: "cfg-1",
  name: "test",
  cuit: "20123456789",
  cert: "CERT",
  privateKey: "KEY",
  production: false,
  certExpiresAt: null,
  certExpiryNotifiedAt: null,
  updatedAt: new Date(),
  createdAt: new Date(),
};

const makeRepo = (value: ArcaConfig | null = config): ArcaConfigRepository => ({
  list: jest.fn(), listWithApiKeys: jest.fn(), getById: jest.fn().mockResolvedValue(value), getByApiKeyId: jest.fn(),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(), assignApiKey: jest.fn(), unassignApiKey: jest.fn(),
  updateCertExpiryNotifiedAt: jest.fn(),
});

describe("RefreshArcaTicket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.rm as jest.Mock).mockResolvedValue(undefined);
    loginMock.mockResolvedValue({ getExpiration: () => new Date("2026-08-11T12:00:00.000Z") });
  });

  it("clears every cached ticket and obtains a fresh WSFE ticket", async () => {
    const result = await new RefreshArcaTicket(makeRepo()).execute("cfg-1");

    expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining(path.join("arca-tickets", "cfg-1")), { recursive: true, force: true });
    expect(storageMock).toHaveBeenCalledWith(expect.objectContaining({ cuit: 20123456789, production: false }));
    expect(loginMock).toHaveBeenCalledWith("wsfe");
    expect(result).toEqual({ service: "wsfe", expiresAt: new Date("2026-08-11T12:00:00.000Z") });
  });

  it("fails when the configuration does not exist", async () => {
    await expect(new RefreshArcaTicket(makeRepo(null)).execute("missing"))
      .rejects.toThrow("ARCA_CONFIG_NOT_FOUND");
    expect(fs.rm).not.toHaveBeenCalled();
  });

  it("normalizes ARCA or filesystem failures", async () => {
    loginMock.mockRejectedValue(new Error("ARCA unavailable"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(new RefreshArcaTicket(makeRepo()).execute("cfg-1"))
        .rejects.toThrow("ARCA_TICKET_REFRESH_FAILED");
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
