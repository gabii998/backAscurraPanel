import type { Notification } from "../entities/Notification";

export interface NotificationRepository {
  create(n: Notification): Promise<Notification>;
  listByUser(userId: string, limit?: number): Promise<Notification[]>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  deleteAllByUser(userId: string): Promise<void>;
}
