import { GetMPPaymentByReference } from "../../src/application/use-cases/GetMPPaymentByReference";

const getPaymentMock = jest.fn();

jest.mock("../../src/infrastructure/services/MercadoPagoClient", () => ({
  MercadoPagoClient: jest.fn().mockImplementation(() => ({ getPayment: getPaymentMock })),
}));

describe("GetMPPaymentByReference", () => {
  beforeEach(() => getPaymentMock.mockReset());

  it("uses the API key configuration and returns Mercado Pago's canonical payment state", async () => {
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
        paymentId: "77", status: "pending", externalReference: "subscription:1:2:abc", amount: 12000, currency: "ARS",
      }) } as any,
    ).execute("key-1", "subscription:1:2:abc");

    expect(result).toEqual(expect.objectContaining({ id: "77", status: "approved", external_reference: "subscription:1:2:abc" }));
  });

  it("keeps a payment pending until the Mercado Pago webhook has supplied its payment id", async () => {
    const result = await new GetMPPaymentByReference(
      { getByApiKeyId: jest.fn().mockResolvedValue({ id: "cfg-1" }) } as any,
      { getByExternalReference: jest.fn().mockResolvedValue({
        paymentId: "", status: "pending", externalReference: "subscription:1:2:abc", amount: 12000, currency: "ARS",
      }) } as any,
    ).execute("key-1", "subscription:1:2:abc");

    expect(result).toEqual(expect.objectContaining({ id: "", status: "pending" }));
    expect(getPaymentMock).not.toHaveBeenCalled();
  });
});
