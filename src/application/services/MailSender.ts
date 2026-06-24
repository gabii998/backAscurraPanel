export interface MailSendParams {
  to: string;
  subject: string;
  html: string;
}

export interface MailSender {
  sendMail(params: MailSendParams): Promise<{ messageId: string }>;
}
