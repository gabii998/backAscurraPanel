import { GetMPPaymentByReference } from "../../src/application/use-cases/GetMPPaymentByReference";

const getPaymentMock = jest.fn();
const findPaymentByExternalReferenceMock = jest.fn();

jest.mock("../../src/infrastructure/services/MercadoPagoClient", () => ({
  MercadoPagoClient: jest.fn().mockImplementation(() => ({
    getPayment: getPaymentMock,
    findPaymentByExternalReference: findPaymentByExternalReferenceMock,
  })),
}));

describe("GetMPPaymentByReference", () => {
  beforeEach(() => {
    getPaymentMock.mockReset();
    findPaymentByExternalReferenceMock.mockReset();
  });

  it("uses the stored paymentId and returns Mercado Pago's canonical payment state", async () => {
    getPaymentMock.mockResolvedValue({
      id: 77,
      status: "approved",
      status_detail: "accredited",
      external_reference: "subscription:1:2:abc",
      transaction_amount: 12000,
      currency_id: "ARS",
    });
    const result = await new GetMPPaymentByReference(
      { getByApiKeyId: jest.fn().mockResolvedValue({ id: "cfg-1", accessToken: "token" }) } as any,
      { getByExternalReference: jest.fn().mockResolvedValue({
        id: "log-1", paymentId: "77", status: "pending", externalReference: "subscription:1:2:abc", amount: 12000, currency: "ARS",
      }) } as any,
    ).execute("key-1", "subscription:1:2:abc");

    expect(result).toEqual(expect.objectContaining({ id: "77", status: "approved", external_reference: "subscription:1:2:abc" }));
    expect(findPaymentByExternalReferenceMock).not.toHaveBeenCalled();
  });

  it("searches Mercado Pago directly by external_reference when the webhook hasn't supplied a paymentId yet, and persists what it finds", async () => {
    findPaymentByExternalReferenceMock.mockResolvedValue({
      id: 88,
      status: "approved",
      status_detail: "accredited",
      external_reference: "subscription:1:2:abc",
      transaction_amount: 12000,
      currency_id: "ARS",
    });
    const logRepo = {
      getByExternalReference: jest.fn().mockResolvedValue({
        id: "log-1", paymentId: "", status: "pending", externalReference: "subscription:1:2:abc", amount: 12000, currency: "ARS",
      }),
      updateStatus: jest.fn(),
    };

    const result = await new GetMPPaymentByReference(
      { getByApiKeyId: jest.fn().mockResolvedValue({ id: "cfg-1", accessToken: "token" }) } as any,
      logRepo as any,
    ).execute("key-1", "subscription:1:2:abc");

    expect(result).toEqual(expect.objectContaining({ id: "88", status: "approved" }));
    expect(logRepo.updateStatus).toHaveBeenCalledWith("log-1", expect.objectContaining({
      status: "approved",
      paymentId: "88",
    }));
    expect(getPaymentMock).not.toHaveBeenCalled();
  });

  it("keeps the stored pending status when Mercado Pago has no matching payment yet, without touching the log", async () => {
    findPaymentByExternalReferenceMock.mockResolvedValue(null);
    const logRepo = {
      getByExternalReference: jest.fn().mockResolvedValue({
        id: "log-1", paymentId: "", status: "pending", externalReference: "subscription:1:2:abc", amount: 12000, currency: "ARS",
      }),
      updateStatus: jest.fn(),
    };

    const result = await new GetMPPaymentByReference(
      { getByApiKeyId: jest.fn().mockResolvedValue({ id: "cfg-1", accessToken: "token" }) } as any,
      logRepo as any,
    ).execute("key-1", "subscription:1:2:abc");

    expect(result).toEqual(expect.objectContaining({ id: "", status: "pending" }));
    expect(logRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("falls back to the stored pending status when the Mercado Pago search itself fails", async () => {
    findPaymentByExternalReferenceMock.mockRejectedValue(new Error("OFFLINE"));
    const logRepo = {
      getByExternalReference: jest.fn().mockResolvedValue({
        id: "log-1", paymentId: "", status: "pending", externalReference: "subscription:1:2:abc", amount: 12000, currency: "ARS",
      }),
      updateStatus: jest.fn(),
    };

    const result = await new GetMPPaymentByReference(
      { getByApiKeyId: jest.fn().mockResolvedValue({ id: "cfg-1", accessToken: "token" }) } as any,
      logRepo as any,
    ).execute("key-1", "subscription:1:2:abc");

    expect(result).toEqual(expect.objectContaining({ id: "", status: "pending" }));
    expect(logRepo.updateStatus).not.toHaveBeenCalled();
  });
});
