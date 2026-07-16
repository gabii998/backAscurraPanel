import type { MailConfigRepository } from "../../domain/repositories/MailConfigRepository";
import type { MailTemplateRepository } from "../../domain/repositories/MailTemplateRepository";
import type { MailLogRepository } from "../../domain/repositories/MailLogRepository";
import type { MailSender } from "../services/MailSender";
import { NodemailerMailSender } from "../../infrastructure/services/NodemailerMailSender";

export interface SendMailInput {
  apiKeyId: string;
  config: string;       // nombre de la MailConfig a usar
  to: string;
  template?: string;
  vars?: Record<string, string>;
  subject?: string;
  html?: string;
}

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export class SendMail {
  constructor(
    private configRepo: MailConfigRepository,
    private templateRepo: MailTemplateRepository,
    private logRepo: MailLogRepository,
  ) {}

  async execute(input: SendMailInput): Promise<{ messageId: string }> {
    if (!input.config) throw new Error("MISSING_CONFIG");

    const config = await this.configRepo.getByNameAndApiKeyId(input.config, input.apiKeyId);
    if (!config) throw new Error("CONFIG_NOT_FOUND");

    let resolvedSubject: string;
    let resolvedHtml: string;
    let templateName = "";

    if (input.template) {
      const tpl = await this.templateRepo.getByName(input.template, config.id);
      if (!tpl) throw new Error("TEMPLATE_NOT_FOUND");

      const vars = input.vars ?? {};
      const missing = tpl.params.filter(p => !(p in vars));
      if (missing.length > 0) throw new Error("MISSING_TEMPLATE_VARS");

      resolvedSubject = applyVars(tpl.subject, vars);
      resolvedHtml    = applyVars(tpl.html, vars);
      templateName    = tpl.name;
    } else {
      if (!input.subject || !input.html) throw new Error("MISSING_FIELDS");
      resolvedSubject = input.subject;
      resolvedHtml    = input.html;
    }

    if (!input.to) throw new Error("MISSING_FIELDS");

    const sender: MailSender = new NodemailerMailSender(config);

    let messageId = "";
    let status = "sent";
    let error = "";

    try {
      const result = await sender.sendMail({ to: input.to, subject: resolvedSubject, html: resolvedHtml });
      messageId = result.messageId;
    } catch (err) {
      status = "failed";
      error = err instanceof Error ? err.message : String(err);
    }

    await this.logRepo.create({
      configId:     config.id,
      to:           input.to,
      subject:      resolvedSubject,
      templateName,
      status,
      error,
      messageId,
    });

    if (status === "failed") throw new Error("MAIL_SEND_FAILED");

    return { messageId };
  }
}
