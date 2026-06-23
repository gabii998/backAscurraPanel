import { randomUUID } from "crypto";
import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import type { Notification } from "../../domain/entities/Notification";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  entityId?: string;
}

export class CreateNotification {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(input: CreateNotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityId: input.entityId ?? null,
      read: false,
      createdAt: new Date(),
    };
    return this.repository.create(notification);
  }
}
