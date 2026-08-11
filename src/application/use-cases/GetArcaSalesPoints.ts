import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";
import { ArcaResponseError, assertArcaResponseOk, formatArcaResponseError } from "../services/ArcaResponseError";
import { ArcaService } from "../../infrastructure/services/ArcaService";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function extractSalesPoints(response: unknown): unknown {
  if (!isRecord(response)) return response;

  const resultGet = response["resultGet"] ?? response["ResultGet"];
  if (!isRecord(resultGet)) return response;

  const ptoVenta = resultGet["ptoVenta"] ?? resultGet["PtoVenta"];
  return Array.isArray(ptoVenta) ? ptoVenta : response;
}

export class GetArcaSalesPoints {
  constructor(
    private configRepo: ArcaConfigRepository,
    private logRepo: ArcaLogRepository,
  ) {}

  async execute(apiKeyId: string, cuit: string): Promise<unknown> {
    const config = await this.configRepo.getByApiKeyId(apiKeyId);
    if (!config) throw new Error("ARCA_NOT_CONFIGURED");

    const service = new ArcaService({ ...config, cuit, configId: config.id });
    const start = Date.now();
    let response: unknown;
    let status = "ok";
    let error = "";

    try {
      response = await service.billing.getSalesPoints();
      assertArcaResponseOk(response);
    } catch (err) {
      status = "error";
      error = err instanceof ArcaResponseError
        ? formatArcaResponseError(err.detail)
        : err instanceof Error ? err.message : String(err);
      response = response ?? { error };
      try {
        await this.logRepo.create({
          configId: config.id, emisorCuit: cuit, service: "wsfe", method: "getSalesPoints",
          request: JSON.stringify({ cuit }), response: JSON.stringify(response),
          status, error, durationMs: Date.now() - start, idempotencyKey: null,
        });
      } catch (logErr) {
        console.error("[ArcaLog] Failed to write error log:", logErr);
      }
      if (err instanceof ArcaResponseError) throw err;
      throw new Error("ARCA_REQUEST_FAILED");
    }

    try {
      await this.logRepo.create({
        configId: config.id, emisorCuit: cuit, service: "wsfe", method: "getSalesPoints",
        request: JSON.stringify({ cuit }), response: JSON.stringify(response),
        status, error, durationMs: Date.now() - start, idempotencyKey: null,
      });
    } catch (logErr) {
      console.error("[ArcaLog] Failed to write success log:", logErr);
    }

    return extractSalesPoints(response);
  }
}
