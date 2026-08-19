import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoLogRepository } from "../../domain/repositories/MercadoPagoLogRepository";
import { MercadoPagoClient } from "../../infrastructure/services/MercadoPagoClient";

export interface GetMPPaymentByReferenceOutput {
  id: string;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
}

export class GetMPPaymentByReference {
  constructor(
    private readonly configRepo: MercadoPagoConfigRepository,
    private readonly logRepo: MercadoPagoLogRepository,
  ) {}

  async execute(apiKeyId: string, externalReference: string): Promise<GetMPPaymentByReferenceOutput> {
    if (!externalReference) throw new Error("MISSING_EXTERNAL_REFERENCE");

    const config = await this.configRepo.getByApiKeyId(apiKeyId);
    if (!config) throw new Error("CONFIG_NOT_FOUND");

    const log = await this.logRepo.getByExternalReference(externalReference, config.id);
    if (!log) throw new Error("PAYMENT_NOT_FOUND");

    if (!log.paymentId) {
      return {
        id: "",
        status: log.status,
        status_detail: "",
        external_reference: log.externalReference,
        transaction_amount: log.amount,
        currency_id: log.currency,
      };
    }

    try {
      const payment = await new MercadoPagoClient(config.accessToken).getPayment(log.paymentId);
      return {
        id: String(payment.id ?? log.paymentId),
        status: payment.status ?? log.status,
        status_detail: payment.status_detail ?? "",
        external_reference: payment.external_reference ?? log.externalReference,
        transaction_amount: payment.transaction_amount ?? log.amount,
        currency_id: payment.currency_id ?? log.currency,
      };
    } catch {
      return {
        id: log.paymentId,
        status: log.status,
        status_detail: "",
        external_reference: log.externalReference,
        transaction_amount: log.amount,
        currency_id: log.currency,
      };
    }
  }
}
