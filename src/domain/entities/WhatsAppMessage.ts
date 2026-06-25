export type MessageDirection = "sent" | "received";

export interface WhatsAppMessage {
  id: string;
  configId: string;
  direction: MessageDirection;
  from: string;
  to: string;
  body: string;
  type: string;
  wamid: string;
  status: string;
  error: string;
  createdAt: Date;
}
