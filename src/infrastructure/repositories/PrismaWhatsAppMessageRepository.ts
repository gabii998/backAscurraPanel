import { prisma } from "../db/prisma";
import type { WhatsAppMessageRepository, ListMessagesFilter } from "../../domain/repositories/WhatsAppMessageRepository";
import type { WhatsAppMessage } from "../../domain/entities/WhatsAppMessage";

export class PrismaWhatsAppMessageRepository implements WhatsAppMessageRepository {
  async create(msg: Omit<WhatsAppMessage, "id" | "createdAt">): Promise<WhatsAppMessage> {
    const record = await prisma.whatsAppMessage.create({ data: msg });
    return { ...record, direction: record.direction as WhatsAppMessage["direction"] };
  }

  async list(filter: ListMessagesFilter, limit = 50): Promise<WhatsAppMessage[]> {
    const records = await prisma.whatsAppMessage.findMany({
      where: {
        ...(filter.configId && { configId: filter.configId }),
        ...(filter.direction && { direction: filter.direction }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return records.map((r: typeof records[number]) => ({ ...r, direction: r.direction as WhatsAppMessage["direction"] }));
  }
}
