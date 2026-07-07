import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoLogRepository } from "../../domain/repositories/MercadoPagoLogRepository";
import { MercadoPagoClient } from "../../infrastructure/services/MercadoPagoClient";

export interface HandleMPWebhookInput {
  configName: string;
  topic?: string;
  type?: string;
  dataId?: string;
  rawBody: unknown;
}

export class HandleMPWebhook {
  constructor(
    private configRepo: MercadoPagoConfigRepository,
    private logRepo:    MercadoPagoLogRepository,
  ) {}

  async execute(input: HandleMPWebhookInput): Promise<void> {
    const config = await this.configRepo.getByName(input.configName);
    if (!config) return; // silently ignore unknown config

    const isPayment = input.topic === "payment" || input.type === "payment";
    if (!isPayment || !input.dataId) return;

    const client = new MercadoPagoClient(config.accessToken);
    let payment;
    try {
      payment = await client.getPayment(input.dataId);
    } catch {
      return;
    }

    const externalReference = payment.external_reference ?? "";
    const status            = payment.status ?? "unknown";
    const amount            = payment.transaction_amount ?? 0;
    const paymentId         = String(payment.id ?? "");

    const log = await this.logRepo.getByExternalReference(externalReference, config.id);
    if (log) {
      await this.logRepo.updateStatus(log.id, status, paymentId, amount);

      if (config.webhookUrl) {
        try {
          await fetch(config.webhookUrl, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              type:               "payment",
              config:             config.name,
              external_reference: externalReference,
              payment_id:         paymentId,
              status,
              amount,
              currency:           payment.currency_id ?? "ARS",
            }),
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          // forward errors are non-fatal — the webhook was already logged
        }
      }
    }
  }
}
