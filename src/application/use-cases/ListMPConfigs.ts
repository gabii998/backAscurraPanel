import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoConfig } from "../../domain/entities/MercadoPagoConfig";

export class ListMPConfigs {
  constructor(private repo: MercadoPagoConfigRepository) {}

  async execute(): Promise<Omit<MercadoPagoConfig, "accessToken" | "mercadoPagoWebhookSecret" | "webhookSecret">[]> {
    const configs = await this.repo.list();
    return configs.map(({ accessToken: _, mercadoPagoWebhookSecret: _mpSecret, webhookSecret: _secret, ...rest }) => rest);
  }
}
