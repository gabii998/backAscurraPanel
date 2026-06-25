import type { WhatsAppMessageRepository, ListMessagesFilter } from "../../domain/repositories/WhatsAppMessageRepository";
import type { WhatsAppMessage } from "../../domain/entities/WhatsAppMessage";

export class ListWhatsAppMessages {
  constructor(private repo: WhatsAppMessageRepository) {}

  async execute(filter: ListMessagesFilter, limit?: number): Promise<WhatsAppMessage[]> {
    return this.repo.list(filter, limit);
  }
}
