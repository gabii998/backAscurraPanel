import nodemailer from "nodemailer";
import type { MailSender, MailSendParams } from "../../application/services/MailSender";
import type { MailConfig } from "../../domain/entities/MailConfig";

export class NodemailerMailSender implements MailSender {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(config: MailConfig) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async sendMail(params: MailSendParams): Promise<{ messageId: string }> {
    const info = await this.transporter.sendMail({
      from:    this.from,
      to:      params.to,
      subject: params.subject,
      html:    params.html,
    });
    return { messageId: info.messageId ?? "" };
  }
}
