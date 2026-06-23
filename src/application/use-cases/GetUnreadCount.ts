import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";

export class GetUnreadCount {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(userId: string): Promise<number> {
    return this.repository.countUnread(userId);
  }
}
