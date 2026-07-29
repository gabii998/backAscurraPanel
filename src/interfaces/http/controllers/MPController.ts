import type { Request, Response } from "express";
import type { CreateMPPreference } from "../../../application/use-cases/CreateMPPreference";
import type { GetMPPayment } from "../../../application/use-cases/GetMPPayment";
import type { HandleMPWebhook } from "../../../application/use-cases/HandleMPWebhook";
import type { ListMPConfigs } from "../../../application/use-cases/ListMPConfigs";
import type { CreateMPConfig } from "../../../application/use-cases/CreateMPConfig";
import type { UpdateMPConfig } from "../../../application/use-cases/UpdateMPConfig";
import type { DeleteMPConfig } from "../../../application/use-cases/DeleteMPConfig";
import type { ListMPLogs } from "../../../application/use-cases/ListMPLogs";
import type { ApiKeyRequest } from "../../../infrastructure/http/express/middleware/ingestKeyMiddleware";

export class MPController {
  constructor(
    private createMPPreference: CreateMPPreference,
    private getMPPayment:       GetMPPayment,
    private handleMPWebhook:    HandleMPWebhook,
    private listMPConfigs:      ListMPConfigs,
    private createMPConfig:     CreateMPConfig,
    private updateMPConfig:     UpdateMPConfig,
    private deleteMPConfig:     DeleteMPConfig,
    private listMPLogs:         ListMPLogs,
  ) {}

  // ── Public (API key) ──────────────────────────────────
  handleCreatePreference = async (req: Request, res: Response): Promise<void> => {
    const { items, external_reference, payer_email } = req.body as Record<string, unknown>;
    const apiKeyId = (req as ApiKeyRequest).apiKey?.id ?? "";

    try {
      const result = await this.createMPPreference.execute({
        apiKeyId,
        items:             Array.isArray(items) ? items as never : [],
        externalReference: typeof external_reference === "string" ? external_reference : undefined,
        payerEmail:        typeof payer_email === "string" ? payer_email : undefined,
      });
      res.status(201).json(result);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err.message === "MISSING_CONFIG")         { res.status(400).json({ message: err.message }); return; }
      if (err.message === "MISSING_ITEMS")          { res.status(400).json({ message: err.message }); return; }
      if (err.message === "INVALID_ITEMS")          { res.status(400).json({ message: err.message }); return; }
      if (err.message === "CONFIG_NOT_FOUND")       { res.status(404).json({ message: err.message }); return; }
      if (err.message === "MP_PREFERENCE_FAILED")   { res.status(502).json({ message: err.message }); return; }
      throw err;
    }
  };

  handleGetPayment = async (req: Request, res: Response): Promise<void> => {
    const { paymentId } = req.params;
    const apiKeyId = (req as ApiKeyRequest).apiKey?.id ?? "";

    try {
      const result = await this.getMPPayment.execute(apiKeyId, paymentId);
      res.json(result);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err.message === "MISSING_PAYMENT_ID") { res.status(400).json({ message: err.message }); return; }
      if (err.message === "CONFIG_NOT_FOUND")   { res.status(404).json({ message: err.message }); return; }
      if (err.message === "PAYMENT_NOT_FOUND")  { res.status(404).json({ message: err.message }); return; }
      throw err;
    }
  };

  // ── Webhook (no auth — called by MercadoPago) ─────────
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const { configName } = req.params;
    const body = req.body as Record<string, unknown>;

    // MP sends two notification formats:
    // Old IPN: { topic: "payment", id: "123" }
    // New webhooks: { type: "payment", action: "payment.updated", data: { id: "123" } }
    const query = req.query as Record<string, unknown>;
    const topic  = this.getText(body["topic"]) ?? this.getText(query["topic"]);
    const type   = this.getText(body["type"])  ?? this.getText(query["type"]);
    const dataId = this.getText((body["data"] as Record<string, unknown> | undefined)?.["id"]) ??
      this.getText(body["id"]) ??
      this.getText(query["data.id"]) ??
      this.getText(query["id"]);

    try {
      await this.handleMPWebhook.execute({
        configName,
        topic,
        type,
        dataId,
        xSignature: req.headers["x-signature"] as string | string[] | undefined,
        xRequestId: req.headers["x-request-id"] as string | string[] | undefined,
        rawBody: body
      });
      res.status(200).end();
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_MP_WEBHOOK_SIGNATURE") {
        res.status(401).end();
        return;
      }
      // Processing errors are non-fatal after the notification is accepted.
      res.status(200).end();
    }
  };

  private getText(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return undefined;
  }

  // ── Configs (JWT + admin) ─────────────────────────────
  handleListConfigs = async (_req: Request, res: Response): Promise<void> => {
    const configs = await this.listMPConfigs.execute();
    res.json(configs);
  };

  handleCreateConfig = async (req: Request, res: Response): Promise<void> => {
    const { name, accessToken, publicKey, mercadoPagoWebhookSecret, webhookSecret, webhookUrl, backUrlSuccess, backUrlFailure, backUrlPending, apiKeyId } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.createMPConfig.execute({
        name:          typeof name === "string" ? name : "",
        accessToken:   typeof accessToken === "string" ? accessToken : "",
        publicKey:     typeof publicKey === "string" ? publicKey : "",
        mercadoPagoWebhookSecret: typeof mercadoPagoWebhookSecret === "string" ? mercadoPagoWebhookSecret : "",
        webhookSecret: typeof webhookSecret === "string" ? webhookSecret : "",
        webhookUrl:    typeof webhookUrl === "string" ? webhookUrl : "",
        backUrlSuccess: typeof backUrlSuccess === "string" ? backUrlSuccess : "",
        backUrlFailure: typeof backUrlFailure === "string" ? backUrlFailure : "",
        backUrlPending: typeof backUrlPending === "string" ? backUrlPending : "",
        apiKeyId:       typeof apiKeyId === "string" && apiKeyId ? apiKeyId : null,
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
    const { name, accessToken, publicKey, mercadoPagoWebhookSecret, webhookSecret, webhookUrl, backUrlSuccess, backUrlFailure, backUrlPending, apiKeyId } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.updateMPConfig.execute(id, {
        ...(typeof name === "string" && { name }),
        ...(typeof accessToken === "string" && accessToken && { accessToken }),
        ...(typeof publicKey === "string" && { publicKey }),
        ...(typeof mercadoPagoWebhookSecret === "string" && { mercadoPagoWebhookSecret }),
        ...(typeof webhookSecret === "string" && { webhookSecret }),
        ...(typeof webhookUrl === "string" && { webhookUrl }),
        ...(typeof backUrlSuccess === "string" && { backUrlSuccess }),
        ...(typeof backUrlFailure === "string" && { backUrlFailure }),
        ...(typeof backUrlPending === "string" && { backUrlPending }),
        ...(apiKeyId !== undefined && { apiKeyId: typeof apiKeyId === "string" && apiKeyId ? apiKeyId : null }),
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
      await this.deleteMPConfig.execute(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  // ── Logs (JWT) ────────────────────────────────────────
  handleListLogs = async (req: Request, res: Response): Promise<void> => {
    const { configId } = req.params;
    const logs = await this.listMPLogs.execute(configId);
    res.json(logs);
  };
}
