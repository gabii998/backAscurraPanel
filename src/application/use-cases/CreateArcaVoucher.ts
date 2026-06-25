import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";
import { ArcaService } from "../../infrastructure/services/ArcaService";

export class CreateArcaVoucher {
  constructor(
    private configRepo: ArcaConfigRepository,
    private logRepo:    ArcaLogRepository,
  ) {}

  async execute(apiKeyId: string, voucher: unknown): Promise<unknown> {
    const config = await this.configRepo.getByApiKeyId(apiKeyId);
    if (!config) throw new Error("ARCA_NOT_CONFIGURED");

    const service = new ArcaService({ ...config, configId: config.id });
    const start   = Date.now();
    let response: unknown;
    let status = "ok";
    let error  = "";

    try {
      response = await service.billing.createNextVoucher(voucher as never);
    } catch (err) {
      status   = "error";
      error    = err instanceof Error ? err.message : String(err);
      response = { error };
      await this.logRepo.create({
        configId: config.id, service: "wsfe", method: "createNextVoucher",
        request: JSON.stringify(voucher), response: JSON.stringify(response),
        status, error, durationMs: Date.now() - start,
      });
      throw new Error("ARCA_VOUCHER_FAILED");
    }

    await this.logRepo.create({
      configId: config.id, service: "wsfe", method: "createNextVoucher",
      request: JSON.stringify(voucher), response: JSON.stringify(response),
      status, error, durationMs: Date.now() - start,
    });

    return response;
  }
}
