import { HandleMPWebhook } from "../../src/application/use-cases/HandleMPWebhook";
import type { MercadoPagoConfig } from "../../src/domain/entities/MercadoPagoConfig";
import type { MercadoPagoConfigRepository } from "../../src/domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoLogRepository } from "../../src/domain/repositories/MercadoPagoLogRepository";

const getPaymentMock = jest.fn();

jest.mock("../../src/infrastructure/services/MercadoPagoClient", () => ({
  MercadoPagoClient: jest.fn().mockImplementation(() => ({
    getPayment: getPaymentMock,
  })),
}));

const config: MercadoPagoConfig = {
  id: "cfg-1",
  name: "default",
  accessToken: "token",
  publicKey: "public",
  mercadoPagoWebhookSecret: "",
  webhookSecret: "secret-123",
  webhookUrl: "https://stock.test/webhooks/mercadopago/subscriptions",
  backUrlSuccess: "",
  backUrlFailure: "",
  backUrlPending: "",
  apiKeyId: "api-key-1",
  updatedAt: new Date(),
  createdAt: new Date(),
};

const configRepo: MercadoPagoConfigRepository = {
  list:          jest.fn(),
  getById:       jest.fn(),
  getByName:     jest.fn().mockResolvedValue(config),
  getByApiKeyId: jest.fn(),
  create:        jest.fn(),
  update:        jest.fn(),
  delete:        jest.fn(),
};

describe("HandleMPWebhook", () => {
  beforeEach(() => {
    getPaymentMock.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: jest.fn().mockResolvedValue("{\"ok\":true}") }) as never;
  });

  it("updates the log and forwards approved payments with the configured secret", async () => {
    getPaymentMock.mockResolvedValue({
      id: 123,
      external_reference: "subscription:1:2:abc",
      status: "approved",
      transaction_amount: 1000,
      currency_id: "ARS",
    });
    const logRepo: MercadoPagoLogRepository = {
      create:                 jest.fn(),
      list:                   jest.fn(),
      getByExternalReference: jest.fn().mockResolvedValue({ id: "log-1" }),
      updateStatus:           jest.fn(),
    };

    await new HandleMPWebhook(configRepo, logRepo).execute({
      configName: "default",
      type: "payment",
      dataId: "123",
      rawBody: {},
    });

    expect(logRepo.updateStatus).toHaveBeenCalledWith("log-1", expect.objectContaining({
      status: "approved",
      paymentId: "123",
      amount: 1000,
      forwardStatusCode: 200,
    }));
    expect(global.fetch).toHaveBeenCalledWith(
      config.webhookUrl,
      expect.objectContaining({
        headers: expect.objectContaining({ "x-ascurra-webhook-secret": "secret-123" }),
      })
    );
  });
});
