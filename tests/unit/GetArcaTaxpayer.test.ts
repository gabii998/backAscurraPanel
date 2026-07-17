import { GetArcaTaxpayer } from "../../src/application/use-cases/GetArcaTaxpayer";
import type { ArcaConfigRepository } from "../../src/domain/repositories/ArcaConfigRepository";
import type { ArcaLogRepository } from "../../src/domain/repositories/ArcaLogRepository";
import type { ArcaConfig } from "../../src/domain/entities/ArcaConfig";

const getTaxpayerDetailsMock = jest.fn();

jest.mock("../../src/infrastructure/services/ArcaService", () => ({
  ArcaService: jest.fn().mockImplementation(() => ({
    padron: { getTaxpayerDetails: getTaxpayerDetailsMock },
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

const makeConfigRepo = (): ArcaConfigRepository => ({
  list: jest.fn(),
  listWithApiKeys: jest.fn(),
  getById: jest.fn(),
  getByApiKeyId: jest.fn().mockResolvedValue(baseConfig),
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

describe("GetArcaTaxpayer", () => {
  beforeEach(() => {
    getTaxpayerDetailsMock.mockReset();
  });

  it("throws ARCA_RESPONSE_ERROR and logs AFIP body errors", async () => {
    const afipResponse = { Errors: { Err: [{ Code: 600, Msg: "CUIT no autorizado" }] } };
    getTaxpayerDetailsMock.mockResolvedValue(afipResponse);
    const logRepo = makeLogRepo();

    await expect(new GetArcaTaxpayer(makeConfigRepo(), logRepo).execute("key-1", 20000000000))
      .rejects.toMatchObject({
        message: "ARCA_RESPONSE_ERROR",
        detail: [{ code: 600, message: "CUIT no autorizado" }],
      });

    expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      status: "error",
      response: JSON.stringify(afipResponse),
      error: "600: CUIT no autorizado",
    }));
  });
});
