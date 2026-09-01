import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import type { Notification } from "../../domain/entities/Notification";
import { prisma } from "../db/prisma";

export class PrismaNotificationRepository implements NotificationRepository {
  async create(n: Notification): Promise<Notification> {
    await prisma.notification.create({
      data: {
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        entityId: n.entityId,
        read: n.read,
        createdAt: n.createdAt,
      },
    });
    return n;
  }

  async listByUser(userId: string, limit = 30): Promise<Notification[]> {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(r => ({ ...r }));
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await prisma.notification.deleteMany({ where: { userId } });
  }
}
