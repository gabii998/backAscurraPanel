import type { WhatsAppConfig } from "../../domain/entities/WhatsAppConfig";

export class WhatsAppService {
  private baseUrl: string;

  constructor(private config: WhatsAppConfig) {
    this.baseUrl = `https://graph.facebook.com/v21.0/${config.phoneNumberId}`;
  }

  async sendText(to: string, body: string): Promise<{ wamid: string }> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as { messages: [{ id: string }] };
    return { wamid: data.messages[0].id };
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === "subscribe" && token === this.config.webhookVerifyToken) return challenge;
    return null;
  }
}
