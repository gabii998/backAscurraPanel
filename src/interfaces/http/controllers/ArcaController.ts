import type { Request, Response } from "express";
import type { CreateArcaConfig } from "../../../application/use-cases/CreateArcaConfig";
import type { UpdateArcaConfig } from "../../../application/use-cases/UpdateArcaConfig";
import type { DeleteArcaConfig } from "../../../application/use-cases/DeleteArcaConfig";
import type { ListArcaConfigs } from "../../../application/use-cases/ListArcaConfigs";
import type { AssignApiKeyToArcaConfig } from "../../../application/use-cases/AssignApiKeyToArcaConfig";
import type { UnassignApiKeyFromArcaConfig } from "../../../application/use-cases/UnassignApiKeyFromArcaConfig";
import type { CreateArcaVoucher } from "../../../application/use-cases/CreateArcaVoucher";
import type { GetArcaSalesPoints } from "../../../application/use-cases/GetArcaSalesPoints";
import type { GetArcaTaxpayer } from "../../../application/use-cases/GetArcaTaxpayer";
import type { ListArcaLogs } from "../../../application/use-cases/ListArcaLogs";
import type { NotifyArcaCertExpiry } from "../../../application/use-cases/NotifyArcaCertExpiry";
import type { GenerateVoucherPdf } from "../../../application/use-cases/GenerateVoucherPdf";
import type { RefreshArcaTicket } from "../../../application/use-cases/RefreshArcaTicket";
import { ArcaResponseError } from "../../../application/services/ArcaResponseError";
import type { ApiKeyRequest } from "../../../infrastructure/http/express/middleware/ingestKeyMiddleware";

export class ArcaController {
  constructor(
    private createArcaConfig:          CreateArcaConfig,
    private updateArcaConfig:          UpdateArcaConfig,
    private deleteArcaConfig:          DeleteArcaConfig,
    private listArcaConfigs:           ListArcaConfigs,
    private assignApiKeyToArcaConfig:  AssignApiKeyToArcaConfig,
    private unassignApiKeyFromArcaConfig: UnassignApiKeyFromArcaConfig,
    private createArcaVoucher:         CreateArcaVoucher,
    private getArcaSalesPoints:        GetArcaSalesPoints,
    private getArcaTaxpayer:           GetArcaTaxpayer,
    private listArcaLogs:              ListArcaLogs,
    private notifyArcaCertExpiry:      NotifyArcaCertExpiry,
    private generateVoucherPdf:        GenerateVoucherPdf,
    private refreshArcaTicket:         RefreshArcaTicket,
  ) {}

  // ── Configs (JWT + admin) ─────────────────────────────

  handleListConfigs = async (_req: Request, res: Response): Promise<void> => {
    const configs = await this.listArcaConfigs.execute();
    res.json(configs);
    this.notifyArcaCertExpiry.execute().catch((err) =>
      console.error("[ArcaCertExpiry] Notification check failed:", err)
    );
  };

  handleCreateConfig = async (req: Request, res: Response): Promise<void> => {
    const { name, cuit, cert, privateKey, production } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.createArcaConfig.execute({
        name:       typeof name       === "string"  ? name       : "",
        cuit:       typeof cuit       === "string"  ? cuit       : "",
        cert:       typeof cert       === "string"  ? cert       : "",
        privateKey: typeof privateKey === "string"  ? privateKey : "",
        production: typeof production === "boolean" ? production : false,
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
    const { name, cuit, cert, privateKey, production } = req.body as Record<string, unknown>;
    try {
      const cfg = await this.updateArcaConfig.execute(id, {
        ...(typeof name       === "string"  && { name }),
        ...(typeof cuit       === "string"  && { cuit }),
        ...(typeof cert       === "string"  && cert && { cert }),
        ...(typeof privateKey === "string"  && privateKey && { privateKey }),
        ...(typeof production === "boolean" && { production }),
      });
      res.json(cfg);
    } catch (err) {
      if (err instanceof Error && err.message === "ARCA_CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleDeleteConfig = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      await this.deleteArcaConfig.execute(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "ARCA_CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleAssignApiKey = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { apiKeyId } = req.body as Record<string, unknown>;
    try {
      await this.assignApiKeyToArcaConfig.execute(id, typeof apiKeyId === "string" ? apiKeyId : "");
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "ARCA_CONFIG_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleUnassignApiKey = async (req: Request, res: Response): Promise<void> => {
    const { apiKeyId } = req.params;
    await this.unassignApiKeyFromArcaConfig.execute(apiKeyId);
    res.status(204).end();
  };

  handleRefreshTicket = async (req: Request, res: Response): Promise<void> => {
    try {
      const ticket = await this.refreshArcaTicket.execute(req.params["id"]);
      res.json({ service: ticket.service, expiresAt: ticket.expiresAt.toISOString() });
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err.message === "ARCA_CONFIG_NOT_FOUND")       { res.status(404).json({ message: err.message }); return; }
      if (err.message === "ARCA_TICKET_REFRESH_FAILED") { res.status(502).json({ message: err.message }); return; }
      throw err;
    }
  };

  // ── Logs (JWT) ────────────────────────────────────────

  handleListLogs = async (req: Request, res: Response): Promise<void> => {
    const { configId } = req.params;
    const page  = typeof req.query["page"]  === "string" ? Math.max(1, parseInt(req.query["page"],  10) || 1) : 1;
    const limit = typeof req.query["limit"] === "string" ? Math.min(200, parseInt(req.query["limit"], 10) || 50) : 50;
    const result = await this.listArcaLogs.execute(configId, page, limit);
    res.json(result);
  };

  // ── Operations (ingestKey) ────────────────────────────

  handleCreateVoucher = async (req: Request, res: Response): Promise<void> => {
    const apiKeyId = (req as ApiKeyRequest).apiKey?.id ?? "";
    const { voucher, idempotencyKey } = req.body as Record<string, unknown>;
    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      res.status(400).json({ message: "IDEMPOTENCY_KEY_REQUIRED" });
      return;
    }
    if (!voucher || typeof voucher !== "object") {
      res.status(400).json({ message: "VOUCHER_REQUIRED" });
      return;
    }
    try {
      const { response, replayed } = await this.createArcaVoucher.execute(apiKeyId, voucher, idempotencyKey);
      if (replayed) {
        res.setHeader("Idempotency-Replayed", "true");
        res.status(200).json(response);
      } else {
        res.status(201).json(response);
      }
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err instanceof ArcaResponseError)                       { res.status(400).json({ message: err.message, detail: err.detail }); return; }
      if (err.message === "ARCA_NOT_CONFIGURED")               { res.status(403).json({ message: err.message }); return; }
      if (err.message === "ARCA_VOUCHER_FAILED")               {
        res.status(502).json({ message: err.message, detail: (err as Error & { detail?: string }).detail ?? "" });
        return;
      }
      if (err.message === "VOUCHER_MISSING_FIELDS")            { res.status(400).json({ message: err.message }); return; }
      if (err.message === "VOUCHER_INVALID_DATE")              { res.status(400).json({ message: err.message }); return; }
      if (err.message === "VOUCHER_MISSING_IVA")               { res.status(400).json({ message: err.message }); return; }
      if (err.message === "VOUCHER_MISSING_COMPROBANTES_ASOC") { res.status(400).json({ message: err.message }); return; }
      console.error("[ArcaVoucher] Unexpected error:", err);
      throw err;
    }
  };

  handleGetSalesPoints = async (req: Request, res: Response): Promise<void> => {
    const apiKeyId = (req as ApiKeyRequest).apiKey?.id ?? "";
    const cuit = (req.query["cuit"] as string | undefined)?.trim() ?? "";
    if (!cuit) { res.status(400).json({ message: "CUIT_REQUIRED" }); return; }
    try {
      const result = await this.getArcaSalesPoints.execute(apiKeyId, cuit);
      res.json(result);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err instanceof ArcaResponseError)     { res.status(400).json({ message: err.message, detail: err.detail }); return; }
      if (err.message === "ARCA_NOT_CONFIGURED")  { res.status(403).json({ message: err.message }); return; }
      if (err.message === "ARCA_REQUEST_FAILED")   { res.status(502).json({ message: err.message }); return; }
      throw err;
    }
  };

  handleGenerateVoucherPdf = async (req: Request, res: Response): Promise<void> => {
    const apiKeyId = (req as ApiKeyRequest).apiKey?.id ?? "";
    const { idempotencyKey, emisor, receptor, items, options } = req.body as Record<string, unknown>;
    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      res.status(400).json({ message: "IDEMPOTENCY_KEY_REQUIRED" }); return;
    }
    if (!emisor || typeof emisor !== "object") {
      res.status(400).json({ message: "EMISOR_REQUIRED" }); return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "ITEMS_REQUIRED" }); return;
    }
    try {
      const buffer = await this.generateVoucherPdf.execute({
        apiKeyId,
        idempotencyKey,
        emisor:   emisor                                          as never,
        receptor: (receptor && typeof receptor === "object" ? receptor : undefined) as never,
        items:    items                                           as never,
        options:  options                                         as never,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="comprobante.pdf"`);
      res.send(buffer);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err.message === "ARCA_NOT_CONFIGURED") { res.status(403).json({ message: err.message }); return; }
      if (err.message === "VOUCHER_NOT_FOUND")   { res.status(404).json({ message: err.message }); return; }
      if (err.message === "VOUCHER_FAILED")      { res.status(422).json({ message: err.message }); return; }
      throw err;
    }
  };

  handleGetTaxpayer = async (req: Request, res: Response): Promise<void> => {
    const apiKeyId    = (req as ApiKeyRequest).apiKey?.id ?? "";
    const identifier  = parseInt(req.params["identifier"] ?? "", 10);
    try {
      const result = await this.getArcaTaxpayer.execute(apiKeyId, identifier);
      res.json(result);
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      if (err instanceof ArcaResponseError)     { res.status(400).json({ message: err.message, detail: err.detail }); return; }
      if (err.message === "ARCA_NOT_CONFIGURED")  { res.status(403).json({ message: err.message }); return; }
      if (err.message === "ARCA_REQUEST_FAILED")   { res.status(502).json({ message: err.message }); return; }
      throw err;
    }
  };
}
