import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";

export class MarkNotificationRead {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    return this.repository.markRead(id, userId);
  }
}
