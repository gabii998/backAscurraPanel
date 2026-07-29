import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoConfig } from "../../domain/entities/MercadoPagoConfig";

export class CreateMPConfig {
  constructor(private repo: MercadoPagoConfigRepository) {}

  async execute(data: {
    name: string;
    accessToken: string;
    publicKey: string;
    mercadoPagoWebhookSecret?: string;
    webhookSecret?: string;
    webhookUrl?: string;
    backUrlSuccess?: string;
    backUrlFailure?: string;
    backUrlPending?: string;
    apiKeyId?: string | null;
  }): Promise<Omit<MercadoPagoConfig, "accessToken" | "mercadoPagoWebhookSecret" | "webhookSecret">> {
    if (!data.name || !data.accessToken || !data.publicKey) throw new Error("MISSING_FIELDS");
    const cfg = await this.repo.create({
      ...data,
      mercadoPagoWebhookSecret: data.mercadoPagoWebhookSecret ?? "",
      webhookSecret:  data.webhookSecret  ?? "",
      webhookUrl:     data.webhookUrl     ?? "",
      backUrlSuccess: data.backUrlSuccess ?? "",
      backUrlFailure: data.backUrlFailure ?? "",
      backUrlPending: data.backUrlPending ?? "",
      apiKeyId:        data.apiKeyId ?? null,
    });
    const { accessToken: _, mercadoPagoWebhookSecret: _mpSecret, webhookSecret: _secret, ...rest } = cfg;
    return rest;
  }
}
