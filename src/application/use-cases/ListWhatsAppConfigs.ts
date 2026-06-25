import type { WhatsAppConfigRepository } from "../../domain/repositories/WhatsAppConfigRepository";
import type { WhatsAppConfigPublic } from "../../domain/entities/WhatsAppConfig";

export class ListWhatsAppConfigs {
  constructor(private repo: WhatsAppConfigRepository) {}

  async execute(): Promise<WhatsAppConfigPublic[]> {
    const configs = await this.repo.list();
    return configs.map(({ accessToken: _a, webhookVerifyToken: _w, ...pub }) => pub);
  }
}
