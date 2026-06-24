import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoConfig } from "../../domain/entities/MercadoPagoConfig";

export class CreateMPConfig {
  constructor(private repo: MercadoPagoConfigRepository) {}

  async execute(data: { name: string; accessToken: string; publicKey: string }): Promise<Omit<MercadoPagoConfig, "accessToken">> {
    if (!data.name || !data.accessToken || !data.publicKey) throw new Error("MISSING_FIELDS");
    const cfg = await this.repo.create(data);
    const { accessToken: _, ...rest } = cfg;
    return rest;
  }
}
