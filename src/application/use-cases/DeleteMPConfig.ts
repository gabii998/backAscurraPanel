import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";

export class DeleteMPConfig {
  constructor(private repo: MercadoPagoConfigRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("CONFIG_NOT_FOUND");
    await this.repo.delete(id);
  }
}
