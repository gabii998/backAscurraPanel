import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoConfig } from "../../domain/entities/MercadoPagoConfig";

export class UpdateMPConfig {
  constructor(private repo: MercadoPagoConfigRepository) {}

  async execute(
    id: string,
    data: { name?: string; accessToken?: string; publicKey?: string; webhookUrl?: string; backUrlSuccess?: string; backUrlFailure?: string; backUrlPending?: string; apiKeyId?: string | null },
  ): Promise<Omit<MercadoPagoConfig, "accessToken">> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("CONFIG_NOT_FOUND");
    const cfg = await this.repo.update(id, data);
    const { accessToken: _, ...rest } = cfg;
    return rest;
  }
}
