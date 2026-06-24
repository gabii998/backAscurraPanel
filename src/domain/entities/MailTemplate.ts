export interface MailTemplate {
  id: string;
  configId: string;
  name: string;
  subject: string;
  html: string;
  params: string[];
  updatedAt: Date;
  createdAt: Date;
}
