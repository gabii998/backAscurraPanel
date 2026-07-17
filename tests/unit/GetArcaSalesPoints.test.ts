import { GetArcaSalesPoints } from "../../src/application/use-cases/GetArcaSalesPoints";
import type { ArcaConfigRepository } from "../../src/domain/repositories/ArcaConfigRepository";
import type { ArcaLogRepository } from "../../src/domain/repositories/ArcaLogRepository";
import type { ArcaConfig } from "../../src/domain/entities/ArcaConfig";

const getSalesPointsMock = jest.fn();

jest.mock("../../src/infrastructure/services/ArcaService", () => ({
  ArcaService: jest.fn().mockImplementation(() => ({
    billing: { getSalesPoints: getSalesPointsMock },
  })),
}));

const baseConfig: ArcaConfig = {
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

const makeConfigRepo = (config: ArcaConfig | null = baseConfig): ArcaConfigRepository => ({
  list: jest.fn(),
  listWithApiKeys: jest.fn(),
  getById: jest.fn(),
  getByApiKeyId: jest.fn().mockResolvedValue(config),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  assignApiKey: jest.fn(),
  unassignApiKey: jest.fn(),
  updateCertExpiryNotifiedAt: jest.fn(),
});

const makeLogRepo = (): ArcaLogRepository => ({
  create: jest.fn().mockResolvedValue({}),
  list: jest.fn(),
  count: jest.fn(),
  findByIdempotencyKey: jest.fn(),
});

describe("GetArcaSalesPoints", () => {
  beforeEach(() => {
    getSalesPointsMock.mockReset();
  });

  it("throws ARCA_RESPONSE_ERROR and logs AFIP body errors", async () => {
    const afipResponse = {
      resultGet: { ptoVenta: [] },
      errors: {
        err: [{ code: 600, msg: "ValidacionDeToken: No aparecio CUIT en lista de relaciones: 20000000000" }],
      },
    };
    getSalesPointsMock.mockResolvedValue(afipResponse);
    const logRepo = makeLogRepo();

    await expect(new GetArcaSalesPoints(makeConfigRepo(), logRepo).execute("key-1", "20000000000"))
      .rejects.toMatchObject({
        message: "ARCA_RESPONSE_ERROR",
        detail: [{ code: 600, message: "ValidacionDeToken: No aparecio CUIT en lista de relaciones: 20000000000" }],
      });

    expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      status: "error",
      response: JSON.stringify(afipResponse),
      error: "600: ValidacionDeToken: No aparecio CUIT en lista de relaciones: 20000000000",
    }));
  });

  it("returns the sales points array when AFIP response does not contain errors", async () => {
    const salesPoints = [{ nro: 1 }];
    const afipResponse = { resultGet: { ptoVenta: salesPoints } };
    getSalesPointsMock.mockResolvedValue(afipResponse);
    const logRepo = makeLogRepo();

    await expect(new GetArcaSalesPoints(makeConfigRepo(), logRepo).execute("key-1", "20123456789"))
      .resolves.toEqual(salesPoints);

    expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      status: "ok",
      response: JSON.stringify(afipResponse),
    }));
  });
});
