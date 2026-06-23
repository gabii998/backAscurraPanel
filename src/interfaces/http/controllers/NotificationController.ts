import type { Request, Response } from "express";
import type { GetNotifications } from "../../../application/use-cases/GetNotifications";
import type { GetUnreadCount } from "../../../application/use-cases/GetUnreadCount";
import type { MarkNotificationRead } from "../../../application/use-cases/MarkNotificationRead";
import type { MarkAllNotificationsRead } from "../../../application/use-cases/MarkAllNotificationsRead";
import type { AuthRequest } from "../../../infrastructure/http/express/middleware/authMiddleware";

export class NotificationController {
  constructor(
    private readonly getNotifications: GetNotifications,
    private readonly getUnreadCount: GetUnreadCount,
    private readonly markNotificationRead: MarkNotificationRead,
    private readonly markAllNotificationsRead: MarkAllNotificationsRead
  ) {}

  // GET /notifications
  async handleList(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    const notifications = await this.getNotifications.execute(userId);
    res.json(notifications);
  }

  // GET /notifications/unread-count
  async handleUnreadCount(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    const count = await this.getUnreadCount.execute(userId);
    res.json({ count });
  }

  // PATCH /notifications/:id/read
  async handleMarkRead(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    await this.markNotificationRead.execute(req.params.id, userId);
    res.status(204).send();
  }

  // PATCH /notifications/read-all
  async handleMarkAllRead(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    await this.markAllNotificationsRead.execute(userId);
    res.status(204).send();
  }
}
