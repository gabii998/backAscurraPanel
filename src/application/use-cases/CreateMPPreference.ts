import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoLogRepository } from "../../domain/repositories/MercadoPagoLogRepository";
import { MercadoPagoClient } from "../../infrastructure/services/MercadoPagoClient";
import { env } from "../../config/env";

export interface MPItem {
  id?: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

export interface CreateMPPreferenceInput {
  apiKeyId: string;
  items: MPItem[];
  externalReference?: string;
  payerEmail?: string;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    try { return JSON.stringify(err); } catch { /* not serializable, fall through */ }
  }
  return String(err);
}

export interface CreateMPPreferenceOutput {
  preference_id: string;
  checkout_url: string;
  sandbox_checkout_url: string;
}

export class CreateMPPreference {
  constructor(
    private configRepo: MercadoPagoConfigRepository,
    private logRepo:    MercadoPagoLogRepository,
  ) {}

  async execute(input: CreateMPPreferenceInput): Promise<CreateMPPreferenceOutput> {
    if (!input.items?.length) throw new Error("MISSING_ITEMS");
    const items = input.items.map((item, idx) => this.normalizeItem(item, idx));
    const amount = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);

    const config = await this.configRepo.getByApiKeyId(input.apiKeyId);
    if (!config) throw new Error("CONFIG_NOT_FOUND");

    const client = new MercadoPagoClient(config.accessToken);
    const notificationUrl = `${env.apiUrl}/mp/webhook/${config.name}`;
    const preferenceRequest = {
      items,
      external_reference: input.externalReference ?? "",
      notification_url:   notificationUrl,
      ...(input.payerEmail && { payer: { email: input.payerEmail } }),
      ...((config.backUrlSuccess || config.backUrlFailure || config.backUrlPending) && {
        back_urls: {
          success: config.backUrlSuccess || undefined,
          failure: config.backUrlFailure || undefined,
          pending: config.backUrlPending || undefined,
        },
        auto_return: "approved" as const,
      }),
    };

    let preference;
    try {
      preference = await client.createPreference(preferenceRequest);
    } catch (err) {
      await this.logRepo.create({
        configId:          config.id,
        externalReference: input.externalReference ?? "",
        preferenceId:      "",
        paymentId:         "",
        checkoutUrl:       "",
        status:            "error",
        amount,
        currency:          "ARS",
        request:           preferenceRequest,
        response:          null,
        webhookPayload:    null,
        forwardStatusCode: null,
        forwardResponse:   "",
        error:             extractErrorMessage(err),
      });
      throw new Error("MP_PREFERENCE_FAILED");
    }

    const checkoutUrl        = preference.init_point ?? "";
    const sandboxCheckoutUrl = preference.sandbox_init_point ?? "";

    await this.logRepo.create({
      configId:          config.id,
      externalReference: input.externalReference ?? "",
      preferenceId:      preference.id ?? "",
      paymentId:         "",
      checkoutUrl,
      status:            "pending",
      amount,
      currency:          "ARS",
      request:           preferenceRequest,
      response:          preference,
      webhookPayload:    null,
      forwardStatusCode: null,
      forwardResponse:   "",
      error:             "",
    });

    return {
      preference_id:        preference.id ?? "",
      checkout_url:         checkoutUrl,
      sandbox_checkout_url: sandboxCheckoutUrl,
    };
  }

  private normalizeItem(item: MPItem, idx: number): Required<MPItem> {
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    const currencyId = typeof item.currency_id === "string" && item.currency_id.trim()
      ? item.currency_id.trim()
      : "ARS";

    if (!title || !Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error("INVALID_ITEMS");
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error("INVALID_ITEMS");
    }

    return {
      id: item.id ?? String(idx + 1),
      title,
      quantity,
      unit_price: unitPrice,
      currency_id: currencyId,
    };
  }
}
