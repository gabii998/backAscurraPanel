import type { WhatsAppConfigRepository } from "../../domain/repositories/WhatsAppConfigRepository";
import type { WhatsAppConfigPublic } from "../../domain/entities/WhatsAppConfig";

export class CreateWhatsAppConfig {
  constructor(private repo: WhatsAppConfigRepository) {}

  async execute(input: {
    name: string;
    phoneNumberId: string;
    accessToken: string;
    webhookVerifyToken: string;
    businessAccountId?: string | null;
  }): Promise<WhatsAppConfigPublic> {
    const { name, phoneNumberId, accessToken, webhookVerifyToken, businessAccountId } = input;
    if (!name || !phoneNumberId || !accessToken || !webhookVerifyToken) {
      throw new Error("MISSING_FIELDS");
    }
    const config = await this.repo.create({
      name,
      phoneNumberId,
      accessToken,
      webhookVerifyToken,
      businessAccountId: businessAccountId ?? null,
    });
    const { accessToken: _a, webhookVerifyToken: _w, ...pub } = config;
    return pub;
  }
}
