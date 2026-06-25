import type { Request, Response } from "express";
import type { CreateWhatsAppConfig } from "../../../application/use-cases/CreateWhatsAppConfig";
import type { ListWhatsAppConfigs } from "../../../application/use-cases/ListWhatsAppConfigs";
import type { UpdateWhatsAppConfig } from "../../../application/use-cases/UpdateWhatsAppConfig";
import type { DeleteWhatsAppConfig } from "../../../application/use-cases/DeleteWhatsAppConfig";
import type { AssignApiKeyToWhatsAppConfig } from "../../../application/use-cases/AssignApiKeyToWhatsAppConfig";
import type { UnassignApiKeyFromWhatsAppConfig } from "../../../application/use-cases/UnassignApiKeyFromWhatsAppConfig";
import type { SendWhatsAppMessage } from "../../../application/use-cases/SendWhatsAppMessage";
import type { HandleWhatsAppWebhook } from "../../../application/use-cases/HandleWhatsAppWebhook";
import type { ListWhatsAppMessages } from "../../../application/use-cases/ListWhatsAppMessages";
import type { ListWhatsAppLogs } from "../../../application/use-cases/ListWhatsAppLogs";
import type { ApiKeyRequest } from "../../../infrastructure/http/express/middleware/ingestKeyMiddleware";
import type { MessageDirection } from "../../../domain/entities/WhatsAppMessage";

export class WhatsAppController {
  constructor(
    private createConfig:    CreateWhatsAppConfig,
    private listConfigs:     ListWhatsAppConfigs,
    private updateConfig:    UpdateWhatsAppConfig,
    private deleteConfig:    DeleteWhatsAppConfig,
    private assignApiKey:    AssignApiKeyToWhatsAppConfig,
    private unassignApiKey:  UnassignApiKeyFromWhatsAppConfig,
    private sendMessage:     SendWhatsAppMessage,
    private handleWebhookUC: HandleWhatsAppWebhook,
    private listMessages:    ListWhatsAppMessages,
    private listLogs:        ListWhatsAppLogs,
  ) {}

  // ── Configs (JWT + admin) ─────────────────────────────

  handleListConfigs = async (_req: Request, res: Response): Promise<void> => {
    const configs = await this.listConfigs.execute();
    res.json(configs);
  };

  handleCreateConfig = async (req: Request, res: Response): Promise<void> => {
    const { name, phoneNumberId, accessToken, webhookVerifyToken, businessAccountId } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.createConfig.execute({
        name:               typeof name               === "string" ? name               : "",
        phoneNumberId:      typeof phoneNumberId      === "string" ? phoneNumberId      : "",
        accessToken:        typeof accessToken        === "string" ? accessToken        : "",
        webhookVerifyToken: typeof webhookVerifyToken === "string" ? webhookVerifyToken : "",
        businessAccountId:  typeof businessAccountId  === "string" ? businessAccountId  : null,
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
    const { name, phoneNumberId, accessToken, webhookVerifyToken, businessAccountId } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.updateConfig.execute(id, {
        ...(typeof name               === "string" && { name }),
        ...(typeof phoneNumberId      === "string" && phoneNumberId && { phoneNumberId }),
        ...(typeof accessToken        === "string" && accessToken   && { accessToken }),
        ...(typeof webhookVerifyToken === "string" && webhookVerifyToken && { webhookVerifyToken }),
        ...(businessAccountId !== undefined && { businessAccountId: typeof businessAccountId === "string" ? businessAccountId : null }),
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
      await this.deleteConfig.execute(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleAssignApiKey = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { apiKeyId } = req.body as Record<string, unknown>;
    try {
      await this.assignApiKey.execute(id, typeof apiKeyId === "string" ? apiKeyId : "");
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleUnassignApiKey = async (req: Request, res: Response): Promise<void> => {
    const { id, apiKeyId } = req.params;
    try {
      await this.unassignApiKey.execute(id, apiKeyId ?? "");
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  // ── Messages & Logs (JWT) ─────────────────────────────

  handleListMessages = async (req: Request, res: Response): Promise<void> => {
    const { configId } = req.params;
    const direction = req.query["direction"] as MessageDirection | undefined;
    const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : undefined;
    const messages = await this.listMessages.execute({ configId, direction }, limit);
    res.json(messages);
  };

  handleListLogs = async (req: Request, res: Response): Promise<void> => {
    const { configId } = req.params;
    const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : undefined;
    const logs = await this.listLogs.execute(configId, limit);
    res.json(logs);
  };

  // ── Webhook (no auth) ─────────────────────────────────

  handleVerifyWebhook = async (req: Request, res: Response): Promise<void> => {
    const { configName } = req.params;
    const mode      = req.query["hub.mode"]         as string ?? "";
    const token     = req.query["hub.verify_token"] as string ?? "";
    const challenge = req.query["hub.challenge"]    as string ?? "";

    const config = await this.listConfigs.execute().then((cs) => cs.find((c) => c.name === configName));
    if (!config) { res.status(404).json({ message: "CONFIG_NOT_FOUND" }); return; }

    if (mode === "subscribe") {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ message: "FORBIDDEN" });
    }
    return;
    void token;
  };

  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const { configName } = req.params;
    res.status(200).end();
    void this.handleWebhookUC.execute(configName, req.body as Record<string, unknown>).catch(() => undefined);
  };

  // ── Send (ingestKey) ──────────────────────────────────

  handleSend = async (req: Request, res: Response): Promise<void> => {
    const apiKeyId = (req as ApiKeyRequest).apiKey?.id ?? "";
    const { to, body } = req.body as Record<string, unknown>;
    try {
      const msg = await this.sendMessage.execute(
        apiKeyId,
        typeof to   === "string" ? to   : "",
        typeof body === "string" ? body : "",
      );
      res.status(201).json(msg);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err.message === "WHATSAPP_NOT_CONFIGURED") { res.status(403).json({ message: err.message }); return; }
      if (err.message === "WHATSAPP_SEND_FAILED")    { res.status(502).json({ message: err.message }); return; }
      throw err;
    }
  };
}
