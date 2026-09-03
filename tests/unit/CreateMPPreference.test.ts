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

  it("returns the production checkout URL for production credentials", async () => {
    createPreferenceMock.mockResolvedValue({
      id: "pref-1",
      init_point: "https://checkout.test",
      sandbox_init_point: "https://sandbox.test",
    });
    const uc = new CreateMPPreference(makeConfigRepo(), makeLogRepo());

    const result = await uc.execute({
      apiKeyId: "api-key-1",
      externalReference: "ref-1",
      items: [{ title: "Plan", quantity: 1, unit_price: 1000 }],
    });

    expect(result.checkout_url).toBe("https://checkout.test");
  });

  it("returns the sandbox checkout URL when the config uses TEST credentials, since MP rejects production checkout for them", async () => {
    createPreferenceMock.mockResolvedValue({
      id: "pref-1",
      init_point: "https://checkout.test",
      sandbox_init_point: "https://sandbox.test",
    });
    const configRepo = makeConfigRepo({
      getByApiKeyId: jest.fn().mockResolvedValue({ ...config, accessToken: "TEST-abc123" }),
    });
    const uc = new CreateMPPreference(configRepo, makeLogRepo());

    const result = await uc.execute({
      apiKeyId: "api-key-1",
      externalReference: "ref-1",
      items: [{ title: "Plan", quantity: 1, unit_price: 1000 }],
    });

    expect(result.checkout_url).toBe("https://sandbox.test");
  });

  it("URL-encodes the config name in the notification_url, since names may contain spaces or brackets", async () => {
    createPreferenceMock.mockResolvedValue({
      id: "pref-1",
      init_point: "https://checkout.test",
      sandbox_init_point: "https://sandbox.test",
    });
    const configRepo = makeConfigRepo({
      getByApiKeyId: jest.fn().mockResolvedValue({ ...config, name: "[DEV] Erpy" }),
    });
    const uc = new CreateMPPreference(configRepo, makeLogRepo());

    await uc.execute({
      apiKeyId: "api-key-1",
      externalReference: "ref-1",
      items: [{ title: "Plan", quantity: 1, unit_price: 1000 }],
    });

    expect(createPreferenceMock).toHaveBeenCalledWith(expect.objectContaining({
      notification_url: expect.stringContaining("/mp/webhook/%5BDEV%5D%20Erpy"),
    }));
  });

  it("stores a readable error message when MercadoPago rejects with a plain error object instead of an Error instance", async () => {
    createPreferenceMock.mockRejectedValue({
      message: "notification_url invalid. Wrong format",
      error: "invalid_notification_url",
      status: 400,
      cause: null,
    });
    const logRepo = makeLogRepo();
    const uc = new CreateMPPreference(makeConfigRepo(), logRepo);

    await expect(uc.execute({
      apiKeyId: "api-key-1",
      externalReference: "ref-1",
      items: [{ title: "Plan", quantity: 1, unit_price: 1000 }],
    })).rejects.toThrow("MP_PREFERENCE_FAILED");

    const loggedError = (logRepo.create as jest.Mock).mock.calls[0][0].error;
    expect(loggedError).not.toBe("[object Object]");
    expect(JSON.parse(loggedError)).toEqual(expect.objectContaining({
      error: "invalid_notification_url",
    }));
  });
});
