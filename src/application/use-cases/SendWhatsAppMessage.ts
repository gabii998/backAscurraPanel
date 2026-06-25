import type { WhatsAppConfigRepository } from "../../domain/repositories/WhatsAppConfigRepository";
import type { WhatsAppMessageRepository } from "../../domain/repositories/WhatsAppMessageRepository";
import type { WhatsAppLogRepository } from "../../domain/repositories/WhatsAppLogRepository";
import type { WhatsAppMessage } from "../../domain/entities/WhatsAppMessage";
import { WhatsAppService } from "../../infrastructure/services/WhatsAppService";

export class SendWhatsAppMessage {
  constructor(
    private configRepo:  WhatsAppConfigRepository,
    private messageRepo: WhatsAppMessageRepository,
    private logRepo:     WhatsAppLogRepository,
  ) {}

  async execute(apiKeyId: string, to: string, body: string): Promise<WhatsAppMessage> {
    const config = await this.configRepo.getByApiKeyId(apiKeyId);
    if (!config) throw new Error("WHATSAPP_NOT_CONFIGURED");

    const service = new WhatsAppService(config);
    const start   = Date.now();
    let wamid  = "";
    let status = "ok";
    let error  = "";

    try {
      const result = await service.sendText(to, body);
      wamid = result.wamid;
    } catch (err) {
      status = "error";
      error  = err instanceof Error ? err.message : String(err);

      await this.logRepo.create({
        configId: config.id, method: "sendText",
        request:  JSON.stringify({ to, body }),
        response: JSON.stringify({ error }),
        status, error, durationMs: Date.now() - start,
      });

      throw new Error("WHATSAPP_SEND_FAILED");
    }

    await this.logRepo.create({
      configId: config.id, method: "sendText",
      request:  JSON.stringify({ to, body }),
      response: JSON.stringify({ wamid }),
      status, error, durationMs: Date.now() - start,
    });

    return this.messageRepo.create({
      configId: config.id, direction: "sent",
      from: config.phoneNumberId, to, body, type: "text",
      wamid, status: "sent", error: "",
    });
  }
}
