import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";

export class MarkAllNotificationsRead {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    return this.repository.markAllRead(userId);
  }
}
