import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";
import { ArcaResponseError, ArcaResponseErrorDetail, assertArcaResponseOk, formatArcaResponseError } from "../services/ArcaResponseError";
import { ArcaService } from "../../infrastructure/services/ArcaService";

const REQUIRED_FIELDS = [
  "CantReg", "PtoVta", "CbteTipo", "Concepto", "DocTipo", "DocNro",
  "CbteFch", "ImpTotal", "ImpTotConc",
  "ImpNeto", "ImpOpEx", "ImpIVA", "ImpTrib", "MonId", "MonCotiz",
  "CondicionIVAReceptorId",
] as const;

const NOTE_TYPES = new Set([2, 3, 7, 8, 12, 13]);

function validateVoucher(v: Record<string, unknown>): void {
  const missing = REQUIRED_FIELDS.filter((f) => v[f] === undefined || v[f] === null || v[f] === "");
  if (missing.length > 0) throw new Error("VOUCHER_MISSING_FIELDS");

  const fch = String(v["CbteFch"]);
  if (!/^\d{8}$/.test(fch)) throw new Error("VOUCHER_INVALID_DATE");
  const year = parseInt(fch.slice(0, 4), 10);
  const month = parseInt(fch.slice(4, 6), 10);
  const day = parseInt(fch.slice(6, 8), 10);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    throw new Error("VOUCHER_INVALID_DATE");
  }

  if (v["FchVtoPago"] !== undefined) {
    const vtopago = String(v["FchVtoPago"]);
    if (!/^\d{8}$/.test(vtopago) || vtopago < fch) throw new Error("VOUCHER_INVALID_DATE");
  }

  const concepto = Number(v["Concepto"]);
  if (concepto === 2 || concepto === 3) {
    if (!v["FchServDesde"] || !v["FchServHasta"]) throw new Error("VOUCHER_MISSING_FIELDS");
  }

  const impIva = Number(v["ImpIVA"]);
  if (impIva > 0) {
    const iva = v["Iva"];
    if (!Array.isArray(iva) || iva.length === 0) throw new Error("VOUCHER_MISSING_IVA");
  }

  const cbteTipo = Number(v["CbteTipo"]);
  if (NOTE_TYPES.has(cbteTipo)) {
    const asoc = v["CbtesAsoc"];
    if (!Array.isArray(asoc) || asoc.length === 0) {
      throw new Error("VOUCHER_MISSING_COMPROBANTES_ASOC");
    }
  }
}

export interface VoucherResult {
  response: unknown;
  replayed: boolean;
}

export class CreateArcaVoucher {
  constructor(
    private configRepo: ArcaConfigRepository,
    private logRepo: ArcaLogRepository,
  ) {}

  async execute(apiKeyId: string, voucher: unknown, idempotencyKey: string): Promise<VoucherResult> {
    const existing = await this.logRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const existingResponse = JSON.parse(existing.response) as Record<string, unknown>;
      if (String(existingResponse["cae"] ?? "")) {
        return { response: existingResponse, replayed: true };
      }
      // CAE vacío → log de rechazo almacenado incorrectamente; permitir re-emisión
    }

    const config = await this.configRepo.getByApiKeyId(apiKeyId);
    if (!config) throw new Error("ARCA_NOT_CONFIGURED");

    validateVoucher(voucher as Record<string, unknown>);

    const service = new ArcaService({ ...config, configId: config.id });
    const start = Date.now();
    let response: unknown;
    let status = "ok";
    let error = "";

    try {
      response = await service.billing.createNextVoucher(voucher as never);
      assertArcaResponseOk((response as Record<string, unknown>)["response"] ?? response);
      const caeValue = String((response as Record<string, unknown>)["cae"] ?? "");
      if (!caeValue) {
        const afipRes = (response as Record<string, unknown>)["response"] as Record<string, unknown> | undefined;
        const detArr = (afipRes?.["FeDetResp"] as Record<string, unknown> | undefined)
          ?.["FECAEDetResponse"] as Record<string, unknown>[] | undefined;
        const det = detArr?.[0];
        const obs = (det?.["Observaciones"] as Record<string, unknown> | undefined)?.["Obs"];
        const detail: ArcaResponseErrorDetail[] = Array.isArray(obs) && obs.length > 0
          ? obs.map((o) => ({
              code: Number((o as Record<string, unknown>)["Code"] ?? 0),
              message: String((o as Record<string, unknown>)["Msg"] ?? ""),
            }))
          : [{ code: "AFIP_REJECTED", message: `Resultado: ${String(det?.["Resultado"] ?? "?")}` }];
        throw new ArcaResponseError(detail);
      }
    } catch (err) {
      status = "error";
      error = err instanceof ArcaResponseError
        ? formatArcaResponseError(err.detail)
        : err instanceof Error ? err.message : String(err);
      response = response ?? { error };
      if (!(err instanceof ArcaResponseError)) {
        console.error("[ArcaVoucher] SDK error in createNextVoucher:", err);
      }
      try {
        await this.logRepo.create({
          configId: config.id, service: "wsfe", method: "createNextVoucher",
          request: JSON.stringify(voucher), response: JSON.stringify(response),
          status, error, durationMs: Date.now() - start,
          idempotencyKey: null,
        });
      } catch (logErr) {
        console.error("[ArcaLog] Failed to write error log:", logErr);
      }
      if (err instanceof ArcaResponseError) throw err;
      const arcaError = new Error("ARCA_VOUCHER_FAILED");
      (arcaError as Error & { detail: string }).detail = error;
      throw arcaError;
    }

    try {
      await this.logRepo.create({
        configId: config.id, service: "wsfe", method: "createNextVoucher",
        request: JSON.stringify(voucher), response: JSON.stringify(response),
        status, error, durationMs: Date.now() - start,
        idempotencyKey,
      });
    } catch (logErr) {
      console.error("[ArcaLog] Failed to write success log:", logErr);
    }

    return { response, replayed: false };
  }
}
