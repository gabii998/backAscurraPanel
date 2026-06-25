import type { WhatsAppMessage, MessageDirection } from "../entities/WhatsAppMessage";

export interface ListMessagesFilter {
  configId?: string;
  direction?: MessageDirection;
}

export interface WhatsAppMessageRepository {
  create(msg: Omit<WhatsAppMessage, "id" | "createdAt">): Promise<WhatsAppMessage>;
  list(filter: ListMessagesFilter, limit?: number): Promise<WhatsAppMessage[]>;
}
