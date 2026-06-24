import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import { MercadoPagoClient } from "../../infrastructure/services/MercadoPagoClient";

export interface GetMPPaymentOutput {
  id: string;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
}

export class GetMPPayment {
  constructor(private configRepo: MercadoPagoConfigRepository) {}

  async execute(configName: string, paymentId: string): Promise<GetMPPaymentOutput> {
    if (!configName) throw new Error("MISSING_CONFIG");
    if (!paymentId)  throw new Error("MISSING_PAYMENT_ID");

    const config = await this.configRepo.getByName(configName);
    if (!config) throw new Error("CONFIG_NOT_FOUND");

    const client = new MercadoPagoClient(config.accessToken);
    let payment;
    try {
      payment = await client.getPayment(paymentId);
    } catch {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    return {
      id:                 String(payment.id ?? ""),
      status:             payment.status ?? "",
      status_detail:      payment.status_detail ?? "",
      external_reference: payment.external_reference ?? "",
      transaction_amount: payment.transaction_amount ?? 0,
      currency_id:        payment.currency_id ?? "ARS",
    };
  }
}
