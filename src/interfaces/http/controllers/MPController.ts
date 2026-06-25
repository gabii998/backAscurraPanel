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
    const { config, items, external_reference, webhook_url, back_url } = req.body as Record<string, unknown>;
    const apiKeyId = (req as ApiKeyRequest).apiKey?.id ?? "";

    try {
      const result = await this.createMPPreference.execute({
        config:            typeof config === "string" ? config : "",
        items:             Array.isArray(items) ? items as never : [],
        externalReference: typeof external_reference === "string" ? external_reference : undefined,
        webhookUrl:        typeof webhook_url === "string" ? webhook_url : undefined,
        backUrl:           typeof back_url === "string" ? back_url : undefined,
      });
      res.status(201).json(result);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err.message === "MISSING_CONFIG")         { res.status(400).json({ message: err.message }); return; }
      if (err.message === "MISSING_ITEMS")          { res.status(400).json({ message: err.message }); return; }
      if (err.message === "CONFIG_NOT_FOUND")       { res.status(404).json({ message: err.message }); return; }
      if (err.message === "MP_PREFERENCE_FAILED")   { res.status(502).json({ message: err.message }); return; }
      throw err;
    }
  };

  handleGetPayment = async (req: Request, res: Response): Promise<void> => {
    const { paymentId } = req.params;
    const config = typeof req.query["config"] === "string" ? req.query["config"] : "";

    try {
      const result = await this.getMPPayment.execute(config, paymentId);
      res.json(result);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err.message === "MISSING_CONFIG")     { res.status(400).json({ message: err.message }); return; }
      if (err.message === "MISSING_PAYMENT_ID") { res.status(400).json({ message: err.message }); return; }
      if (err.message === "CONFIG_NOT_FOUND")   { res.status(404).json({ message: err.message }); return; }
      if (err.message === "PAYMENT_NOT_FOUND")  { res.status(404).json({ message: err.message }); return; }
      throw err;
    }
  };

  // ── Webhook (no auth — called by MercadoPago) ─────────
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    // Respond immediately — MP requires a fast 200
    res.status(200).end();

    const { configName } = req.params;
    const body = req.body as Record<string, unknown>;

    // MP sends two notification formats:
    // Old IPN: { topic: "payment", id: "123" }
    // New webhooks: { type: "payment", action: "payment.updated", data: { id: "123" } }
    const topic  = typeof body["topic"] === "string" ? body["topic"] : undefined;
    const type   = typeof body["type"]  === "string" ? body["type"]  : undefined;
    const dataId = typeof (body["data"] as Record<string, unknown> | undefined)?.["id"] === "string"
      ? String((body["data"] as Record<string, unknown>)["id"])
      : typeof body["id"] === "string" ? body["id"] : undefined;

    await this.handleMPWebhook.execute({ configName, topic, type, dataId, rawBody: body }).catch(() => {
      // webhook processing errors are non-fatal
    });
  };

  // ── Configs (JWT + admin) ─────────────────────────────
  handleListConfigs = async (_req: Request, res: Response): Promise<void> => {
    const configs = await this.listMPConfigs.execute();
    res.json(configs);
  };

  handleCreateConfig = async (req: Request, res: Response): Promise<void> => {
    const { name, accessToken, publicKey } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.createMPConfig.execute({
        name:        typeof name === "string" ? name : "",
        accessToken: typeof accessToken === "string" ? accessToken : "",
        publicKey:   typeof publicKey === "string" ? publicKey : "",
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
    const { name, accessToken, publicKey } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.updateMPConfig.execute(id, {
        ...(typeof name === "string" && { name }),
        ...(typeof accessToken === "string" && accessToken && { accessToken }),
        ...(typeof publicKey === "string" && { publicKey }),
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
