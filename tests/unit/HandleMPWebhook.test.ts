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

const ingestError = { execute: jest.fn().mockResolvedValue({}) };

describe("HandleMPWebhook", () => {
  beforeEach(() => {
    getPaymentMock.mockReset();
    ingestError.execute.mockClear();
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

    await new HandleMPWebhook(configRepo, logRepo, ingestError as any).execute({
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

  it("records a critical operational error when forwarding fails while accepting Mercado Pago's webhook", async () => {
    getPaymentMock.mockResolvedValue({
      id: 123,
      external_reference: "subscription:1:2:abc",
      status: "approved",
      transaction_amount: 1000,
      currency_id: "ARS",
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, text: jest.fn().mockResolvedValue("unavailable") }) as never;
    const logRepo: MercadoPagoLogRepository = {
      create: jest.fn(),
      list: jest.fn(),
      getByExternalReference: jest.fn().mockResolvedValue({ id: "log-1" }),
      updateStatus: jest.fn(),
    };

    await expect(new HandleMPWebhook(configRepo, logRepo, ingestError as any).execute({
      configName: "default",
      type: "payment",
      dataId: "123",
      rawBody: {},
    })).resolves.toBeUndefined();

    expect(ingestError.execute).toHaveBeenCalledWith(expect.objectContaining({
      type: "MERCADOPAGO_SUBSCRIPTION_FORWARD_FAILED",
      severity: "critical",
    }));
    expect(logRepo.updateStatus).toHaveBeenCalledWith("log-1", expect.objectContaining({
      forwardStatusCode: 503,
    }));
  });

  it("records a critical operational error when the Mercado Pago payment lookup fails, instead of discarding it silently", async () => {
    getPaymentMock.mockRejectedValue({ message: "payment not found", status: 404 });
    const logRepo: MercadoPagoLogRepository = {
      create: jest.fn(),
      list: jest.fn(),
      getByExternalReference: jest.fn(),
      updateStatus: jest.fn(),
    };

    await expect(new HandleMPWebhook(configRepo, logRepo, ingestError as any).execute({
      configName: "default",
      type: "payment",
      dataId: "123",
      rawBody: {},
    })).resolves.toBeUndefined();

    expect(ingestError.execute).toHaveBeenCalledWith(expect.objectContaining({
      type: "MERCADOPAGO_WEBHOOK_PAYMENT_FETCH_FAILED",
      severity: "critical",
    }));
    expect(logRepo.getByExternalReference).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
