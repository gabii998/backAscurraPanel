import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoLogRepository } from "../../domain/repositories/MercadoPagoLogRepository";
import { MercadoPagoClient } from "../../infrastructure/services/MercadoPagoClient";

export interface HandleMPWebhookInput {
  configName: string;
  topic?: string;
  type?: string;
  dataId?: string;
  xSignature?: string | string[];
  xRequestId?: string | string[];
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

    if (config.mercadoPagoWebhookSecret) {
      try {
        WebhookSignatureValidator.validate({
          xSignature: input.xSignature,
          xRequestId: input.xRequestId,
          dataId: input.dataId,
          secret: config.mercadoPagoWebhookSecret,
          toleranceSeconds: 300,
        });
      } catch (error) {
        if (error instanceof InvalidWebhookSignatureError) {
          throw new Error("INVALID_MP_WEBHOOK_SIGNATURE");
        }
        throw error;
      }
    }

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
    const currency          = payment.currency_id ?? "ARS";

    const log = await this.logRepo.getByExternalReference(externalReference, config.id);
    if (log) {
      let forwardStatusCode: number | null = null;
      let forwardResponse = "";
      if (config.webhookUrl) {
        try {
          const forward = await fetch(config.webhookUrl, {
            method:  "POST",
            headers: {
              "Content-Type": "application/json",
              ...(config.webhookSecret ? { "x-ascurra-webhook-secret": config.webhookSecret } : {}),
            },
            body:    JSON.stringify({
              type:               "payment",
              config:             config.name,
              external_reference: externalReference,
              payment_id:         paymentId,
              status,
              amount,
              currency,
            }),
            signal: AbortSignal.timeout(5000),
          });
          forwardStatusCode = forward.status;
          forwardResponse = await forward.text().catch(() => "");
        } catch {
          forwardResponse = "FORWARD_FAILED";
        }
      }
      await this.logRepo.updateStatus(log.id, {
        status,
        paymentId,
        amount,
        currency,
        webhookPayload: input.rawBody,
        paymentResponse: payment,
        forwardStatusCode,
        forwardResponse,
      });
    }
  }
}
