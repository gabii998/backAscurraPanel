export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityId: string | null;
  read: boolean;
  createdAt: Date;
}
