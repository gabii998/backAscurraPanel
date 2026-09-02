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
    for (const item of asoc) {
      if (typeof item !== "object" || item === null) {
        throw new Error("VOUCHER_MISSING_COMPROBANTES_ASOC");
      }
      const { Tipo, PtoVta, Nro, Cuit } = item as Record<string, unknown>;
      const missingField = [Tipo, PtoVta, Nro, Cuit].some(
        (f) => f === undefined || f === null || f === ""
      );
      if (missingField) throw new Error("VOUCHER_MISSING_COMPROBANTES_ASOC");
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

  async execute(
    apiKeyId: string,
    voucher: unknown,
    idempotencyKey: string,
    emisorCuit: string
  ): Promise<VoucherResult> {
    const config = await this.configRepo.getByApiKeyId(apiKeyId);
    if (!config) throw new Error("ARCA_NOT_CONFIGURED");
    const effectiveEmisorCuit = emisorCuit.replace(/\D/g, "");
    if (!/^\d{11}$/.test(effectiveEmisorCuit)) throw new Error("EMISOR_CUIT_REQUIRED");

    const existing = await this.logRepo.findByIdempotencyKey(config.id, effectiveEmisorCuit, idempotencyKey);
    if (existing) {
      const existingResponse = JSON.parse(existing.response) as Record<string, unknown>;
      if (String(existingResponse["cae"] ?? existingResponse["CAE"] ?? "")) {
        return { response: existingResponse, replayed: true };
      }
      if (existing.status === "PENDING") throw new Error("ARCA_VOUCHER_PENDING_RECONCILIATION");
      throw new Error("ARCA_VOUCHER_ALREADY_REJECTED");
    }

    validateVoucher(voucher as Record<string, unknown>);

    // WSFEv1 autentica con el CUIT del contribuyente emisor o representado.
    // Fuente oficial: https://www.arca.gob.ar/fe/ayuda/documentos/wsfev1-RG-4291.pdf
    const service = new ArcaService({ ...config, cuit: effectiveEmisorCuit, configId: config.id });
    const start = Date.now();
    const log = await this.logRepo.create({
      configId: config.id, emisorCuit: effectiveEmisorCuit, service: "wsfe", method: "createNextVoucher",
      request: JSON.stringify({ emisorCuit: effectiveEmisorCuit, voucher }), response: JSON.stringify({ pending: true }),
      status: "PENDING", error: "", durationMs: 0, idempotencyKey,
    });
    let response: unknown;
    let status = "ok";
    let error = "";

    try {
      response = await service.billing.createNextVoucher(voucher as never);
      assertArcaResponseOk((response as Record<string, unknown>)["response"] ?? response);
      const caeValue = String(
        (response as Record<string, unknown>)["cae"]
          ?? (response as Record<string, unknown>)["CAE"]
          ?? ""
      );
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
      await this.logRepo.update(log.id, {
        response: JSON.stringify(response),
        status: err instanceof ArcaResponseError ? "REJECTED" : "PENDING",
        error,
        durationMs: Date.now() - start,
      });
      if (err instanceof ArcaResponseError) throw err;
      const arcaError = new Error("ARCA_VOUCHER_FAILED");
      (arcaError as Error & { detail: string }).detail = error;
      throw arcaError;
    }

    await this.logRepo.update(log.id, { response: JSON.stringify(response), status: "ok", error: "", durationMs: Date.now() - start });

    return { response, replayed: false };
  }
}
