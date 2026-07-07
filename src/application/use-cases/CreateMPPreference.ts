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

    const config = await this.configRepo.getByApiKeyId(input.apiKeyId);
    if (!config) throw new Error("CONFIG_NOT_FOUND");

    const client = new MercadoPagoClient(config.accessToken);
    const notificationUrl = `${env.apiUrl}/mp/webhook/${config.name}`;

    let preference;
    try {
      preference = await client.createPreference({
        items: input.items.map((i, idx) => ({
          id:          i.id ?? String(idx + 1),
          title:       i.title,
          quantity:    i.quantity,
          unit_price:  i.unit_price,
          currency_id: i.currency_id ?? "ARS",
        })),
        external_reference: input.externalReference ?? "",
        notification_url:   notificationUrl,
        ...((config.backUrlSuccess || config.backUrlFailure || config.backUrlPending) && {
          back_urls: {
            success: config.backUrlSuccess || undefined,
            failure: config.backUrlFailure || undefined,
            pending: config.backUrlPending || undefined,
          },
          auto_return: "approved" as const,
        }),
      });
    } catch (err) {
      await this.logRepo.create({
        configId:          config.id,
        externalReference: input.externalReference ?? "",
        preferenceId:      "",
        paymentId:         "",
        checkoutUrl:       "",
        status:            "error",
        amount:            0,
        currency:          "ARS",
        error:             err instanceof Error ? err.message : String(err),
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
      amount:            0,
      currency:          "ARS",
      error:             "",
    });

    return {
      preference_id:        preference.id ?? "",
      checkout_url:         checkoutUrl,
      sandbox_checkout_url: sandboxCheckoutUrl,
    };
  }
}
