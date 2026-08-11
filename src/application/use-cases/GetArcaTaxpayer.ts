import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";
import { ArcaResponseError, assertArcaResponseOk, formatArcaResponseError } from "../services/ArcaResponseError";
import { ArcaService } from "../../infrastructure/services/ArcaService";

export class GetArcaTaxpayer {
  constructor(
    private configRepo: ArcaConfigRepository,
    private logRepo: ArcaLogRepository,
  ) {}

  async execute(apiKeyId: string, identifier: number): Promise<unknown> {
    const config = await this.configRepo.getByApiKeyId(apiKeyId);
    if (!config) throw new Error("ARCA_NOT_CONFIGURED");

    const service = new ArcaService({ ...config, configId: config.id });
    const start = Date.now();
    let response: unknown;
    let status = "ok";
    let error = "";

    try {
      response = await service.padron.getTaxpayerDetails(identifier);
      assertArcaResponseOk(response);
    } catch (err) {
      status = "error";
      error = err instanceof ArcaResponseError
        ? formatArcaResponseError(err.detail)
        : err instanceof Error ? err.message : String(err);
      response = response ?? { error };
      try {
        await this.logRepo.create({
          configId: config.id, emisorCuit: config.cuit, service: "padron", method: "getTaxpayerDetails",
          request: JSON.stringify({ identifier }), response: JSON.stringify(response),
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
        configId: config.id, emisorCuit: config.cuit, service: "padron", method: "getTaxpayerDetails",
        request: JSON.stringify({ identifier }), response: JSON.stringify(response),
        status, error, durationMs: Date.now() - start, idempotencyKey: null,
      });
    } catch (logErr) {
      console.error("[ArcaLog] Failed to write success log:", logErr);
    }

    return response;
  }
}
