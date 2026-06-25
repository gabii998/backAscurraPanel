export interface MailLog {
  id: string;
  configId: string;
  to: string;
  subject: string;
  templateName: string;
  status: string;
  error: string;
  messageId: string;
  createdAt: Date;
}
