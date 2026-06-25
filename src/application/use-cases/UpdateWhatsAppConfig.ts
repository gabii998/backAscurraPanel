import type { WhatsAppConfigRepository } from "../../domain/repositories/WhatsAppConfigRepository";
import type { WhatsAppConfigPublic } from "../../domain/entities/WhatsAppConfig";

export class UpdateWhatsAppConfig {
  constructor(private repo: WhatsAppConfigRepository) {}

  async execute(
    id: string,
    input: {
      name?: string;
      phoneNumberId?: string;
      accessToken?: string;
      webhookVerifyToken?: string;
      businessAccountId?: string | null;
    },
  ): Promise<WhatsAppConfigPublic> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("CONFIG_NOT_FOUND");

    const data = {
      ...(input.name && { name: input.name }),
      ...(input.phoneNumberId && { phoneNumberId: input.phoneNumberId }),
      ...(input.accessToken && { accessToken: input.accessToken }),
      ...(input.webhookVerifyToken && { webhookVerifyToken: input.webhookVerifyToken }),
      ...(input.businessAccountId !== undefined && { businessAccountId: input.businessAccountId }),
    };

    const updated = await this.repo.update(id, data);
    const { accessToken: _a, webhookVerifyToken: _w, ...pub } = updated;
    return pub;
  }
}
