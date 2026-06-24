import type { Request, Response } from "express";
import type { SendMail } from "../../../application/use-cases/SendMail";
import type { ListMailConfigs } from "../../../application/use-cases/ListMailConfigs";
import type { CreateMailConfig } from "../../../application/use-cases/CreateMailConfig";
import type { UpdateMailConfig } from "../../../application/use-cases/UpdateMailConfig";
import type { DeleteMailConfig } from "../../../application/use-cases/DeleteMailConfig";
import type { ListMailLogs } from "../../../application/use-cases/ListMailLogs";
import type { ListMailTemplates } from "../../../application/use-cases/ListMailTemplates";
import type { CreateMailTemplate } from "../../../application/use-cases/CreateMailTemplate";
import type { UpdateMailTemplate } from "../../../application/use-cases/UpdateMailTemplate";
import type { DeleteMailTemplate } from "../../../application/use-cases/DeleteMailTemplate";
import type { ApiKeyRequest } from "../../../infrastructure/http/express/middleware/ingestKeyMiddleware";

export class MailController {
  constructor(
    private sendMail:           SendMail,
    private listMailConfigs:    ListMailConfigs,
    private createMailConfig:   CreateMailConfig,
    private updateMailConfig:   UpdateMailConfig,
    private deleteMailConfig:   DeleteMailConfig,
    private listMailLogs:       ListMailLogs,
    private listMailTemplates:  ListMailTemplates,
    private createMailTemplate: CreateMailTemplate,
    private updateMailTemplate: UpdateMailTemplate,
    private deleteMailTemplate: DeleteMailTemplate,
  ) {}

  // ── Send ──────────────────────────────────────────────
  handleSend = async (req: Request, res: Response): Promise<void> => {
    const { to, config, template, vars, subject, html } = req.body as Record<string, unknown>;
    const apiKeyId = (req as ApiKeyRequest).apiKey?.id ?? "";

    try {
      const result = await this.sendMail.execute({
        apiKeyId,
        config:   typeof config === "string" ? config : "",
        to:       typeof to === "string" ? to : "",
        template: typeof template === "string" ? template : undefined,
        vars:     typeof vars === "object" && vars !== null ? (vars as Record<string, string>) : undefined,
        subject:  typeof subject === "string" ? subject : undefined,
        html:     typeof html === "string" ? html : undefined,
      });
      res.status(201).json(result);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err.message === "MISSING_FIELDS")        { res.status(400).json({ message: err.message }); return; }
      if (err.message === "MISSING_CONFIG")        { res.status(400).json({ message: err.message }); return; }
      if (err.message === "CONFIG_NOT_FOUND")      { res.status(404).json({ message: err.message }); return; }
      if (err.message === "TEMPLATE_NOT_FOUND")    { res.status(404).json({ message: err.message }); return; }
      if (err.message === "MISSING_TEMPLATE_VARS") { res.status(400).json({ message: err.message }); return; }
      if (err.message === "MAIL_SEND_FAILED")      { res.status(502).json({ message: err.message }); return; }
      throw err;
    }
  };

  // ── Configs ───────────────────────────────────────────
  handleListConfigs = async (_req: Request, res: Response): Promise<void> => {
    const configs = await this.listMailConfigs.execute();
    res.json(configs);
  };

  handleCreateConfig = async (req: Request, res: Response): Promise<void> => {
    const { name, host, port, user, pass, from } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.createMailConfig.execute({
        name: typeof name === "string" ? name : "",
        host: typeof host === "string" ? host : "",
        port: typeof port === "number" ? port : parseInt(String(port) || "0", 10),
        user: typeof user === "string" ? user : "",
        pass: typeof pass === "string" ? pass : "",
        from: typeof from === "string" ? from : "",
      });
      res.status(201).json(cfg);
    } catch (err) {
      if (err instanceof Error && err.message === "MISSING_FIELDS") {
        res.status(400).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleUpdateConfig = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, host, port, user, pass, from } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.updateMailConfig.execute(id, {
        ...(typeof name === "string" && { name }),
        ...(typeof host === "string" && { host }),
        ...(typeof port === "number" && { port }),
        ...(typeof user === "string" && { user }),
        ...(typeof pass === "string" && pass && { pass }),
        ...(typeof from === "string" && { from }),
      });
      res.json(cfg);
    } catch (err) {
      if (err instanceof Error && err.message === "CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleDeleteConfig = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      await this.deleteMailConfig.execute(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  // ── Logs ─────────────────────────────────────────────
  handleListLogs = async (req: Request, res: Response): Promise<void> => {
    const { configId } = req.params;
    const logs = await this.listMailLogs.execute(configId);
    res.json(logs);
  };

  // ── Templates ─────────────────────────────────────────
  handleListTemplates = async (req: Request, res: Response): Promise<void> => {
    const { configId } = req.params;
    const templates = await this.listMailTemplates.execute(configId);
    res.json(templates);
  };

  handleCreateTemplate = async (req: Request, res: Response): Promise<void> => {
    const { configId } = req.params;
    const { name, subject, html, params } = req.body as Record<string, unknown>;
    try {
      const tpl = await this.createMailTemplate.execute({
        configId,
        name:    typeof name === "string" ? name : "",
        subject: typeof subject === "string" ? subject : "",
        html:    typeof html === "string" ? html : "",
        params:  Array.isArray(params) ? (params as string[]) : [],
      });
      res.status(201).json(tpl);
    } catch (err) {
      if (err instanceof Error && err.message === "MISSING_FIELDS") {
        res.status(400).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleUpdateTemplate = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, subject, html, params } = req.body as Record<string, unknown>;
    try {
      const tpl = await this.updateMailTemplate.execute(id, {
        ...(typeof name === "string"    && { name }),
        ...(typeof subject === "string" && { subject }),
        ...(typeof html === "string"    && { html }),
        ...(Array.isArray(params)       && { params: params as string[] }),
      });
      res.json(tpl);
    } catch (err) {
      if (err instanceof Error && err.message === "TEMPLATE_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleDeleteTemplate = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      await this.deleteMailTemplate.execute(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "TEMPLATE_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };
}
