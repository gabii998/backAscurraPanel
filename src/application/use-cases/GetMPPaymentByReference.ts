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

    const client = new MercadoPagoClient(config.accessToken);

    if (log.paymentId) {
      try {
        const payment = await client.getPayment(log.paymentId);
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

    // El webhook de Mercado Pago todavia no actualizo este log (o nunca llego).
    // En vez de devolver el estado local sin mas, preguntamosle a Mercado Pago
    // directamente por external_reference para que la reconciliacion no dependa
    // exclusivamente del webhook.
    try {
      const found = await client.findPaymentByExternalReference(externalReference);
      if (found) {
        await this.logRepo.updateStatus(log.id, {
          status:          found.status ?? log.status,
          paymentId:       String(found.id ?? ""),
          amount:          found.transaction_amount ?? log.amount,
          currency:        found.currency_id ?? log.currency,
          webhookPayload:  null,
          paymentResponse: found,
        });
        return {
          id: String(found.id ?? ""),
          status: found.status ?? log.status,
          status_detail: found.status_detail ?? "",
          external_reference: found.external_reference ?? log.externalReference,
          transaction_amount: found.transaction_amount ?? log.amount,
          currency_id: found.currency_id ?? log.currency,
        };
      }
    } catch {
      // busqueda fallida: devolvemos el estado local mas abajo
    }

    return {
      id: "",
      status: log.status,
      status_detail: "",
      external_reference: log.externalReference,
      transaction_amount: log.amount,
      currency_id: log.currency,
    };
  }
}
