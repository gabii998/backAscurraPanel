import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import type { Notification } from "../../domain/entities/Notification";

export class GetNotifications {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(userId: string): Promise<Notification[]> {
    return this.repository.listByUser(userId);
  }
}
