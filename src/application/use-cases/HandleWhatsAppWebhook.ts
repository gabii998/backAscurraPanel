import type { WhatsAppConfigRepository } from "../../domain/repositories/WhatsAppConfigRepository";
import type { WhatsAppMessageRepository } from "../../domain/repositories/WhatsAppMessageRepository";

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id: string };
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body: string };
          timestamp: string;
        }>;
      };
    }>;
  }>;
}

export class HandleWhatsAppWebhook {
  constructor(
    private configRepo:  WhatsAppConfigRepository,
    private messageRepo: WhatsAppMessageRepository,
  ) {}

  async execute(configName: string, payload: MetaWebhookPayload): Promise<void> {
    const config = await this.configRepo.getByName(configName);
    if (!config) return;

    const entries = payload.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          const body = msg.text?.body ?? "";
          await this.messageRepo.create({
            configId:  config.id,
            direction: "received",
            from:      msg.from,
            to:        config.phoneNumberId,
            body,
            type:      msg.type,
            wamid:     msg.id,
            status:    "received",
            error:     "",
          });
        }
      }
    }
  }
}
