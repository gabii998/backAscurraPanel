import { CreateMPPreference } from "../../src/application/use-cases/CreateMPPreference";
import type { MercadoPagoConfig } from "../../src/domain/entities/MercadoPagoConfig";
import type { MercadoPagoConfigRepository } from "../../src/domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoLogRepository } from "../../src/domain/repositories/MercadoPagoLogRepository";

const createPreferenceMock = jest.fn();

jest.mock("../../src/infrastructure/services/MercadoPagoClient", () => ({
  MercadoPagoClient: jest.fn().mockImplementation(() => ({
    createPreference: createPreferenceMock,
  })),
}));

const config: MercadoPagoConfig = {
  id: "cfg-1",
  name: "default",
  accessToken: "token",
  publicKey: "public",
  mercadoPagoWebhookSecret: "",
  webhookSecret: "secret",
  webhookUrl: "https://stock.test/webhook",
  backUrlSuccess: "",
  backUrlFailure: "",
  backUrlPending: "",
  apiKeyId: "api-key-1",
  updatedAt: new Date(),
  createdAt: new Date(),
};

const makeConfigRepo = (overrides: Partial<MercadoPagoConfigRepository> = {}): MercadoPagoConfigRepository => ({
  list:          jest.fn(),
  getById:       jest.fn(),
  getByName:     jest.fn(),
  getByApiKeyId: jest.fn().mockResolvedValue(config),
  create:        jest.fn(),
  update:        jest.fn(),
  delete:        jest.fn(),
  ...overrides,
});

const makeLogRepo = (): MercadoPagoLogRepository => ({
  create:                 jest.fn().mockResolvedValue({}),
  list:                   jest.fn(),
  getByExternalReference: jest.fn(),
  updateStatus:           jest.fn(),
});

describe("CreateMPPreference", () => {
  beforeEach(() => {
    createPreferenceMock.mockReset();
  });

  it("rejects invalid items before calling MercadoPago", async () => {
    const uc = new CreateMPPreference(makeConfigRepo(), makeLogRepo());

    await expect(uc.execute({
      apiKeyId: "api-key-1",
      externalReference: "ref-1",
      items: [{ title: "", quantity: 1, unit_price: 100 }],
    })).rejects.toThrow("INVALID_ITEMS");

    expect(createPreferenceMock).not.toHaveBeenCalled();
  });

  it("stores the total amount in the pending log", async () => {
    createPreferenceMock.mockResolvedValue({
      id: "pref-1",
      init_point: "https://checkout.test",
      sandbox_init_point: "https://sandbox.test",
    });
    const logRepo = makeLogRepo();
    const uc = new CreateMPPreference(makeConfigRepo(), logRepo);

    await uc.execute({
      apiKeyId: "api-key-1",
      externalReference: "ref-1",
      items: [
        { title: "Plan", quantity: 2, unit_price: 1500 },
        { title: "Extra", quantity: 1, unit_price: 500 },
      ],
    });

    expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      externalReference: "ref-1",
      preferenceId: "pref-1",
      amount: 3500,
      status: "pending",
    }));
  });
});
