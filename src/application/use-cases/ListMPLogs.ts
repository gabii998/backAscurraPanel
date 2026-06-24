import type { MercadoPagoLogRepository } from "../../domain/repositories/MercadoPagoLogRepository";
import type { MercadoPagoLog } from "../../domain/entities/MercadoPagoLog";

export class ListMPLogs {
  constructor(private repo: MercadoPagoLogRepository) {}

  async execute(configId: string, limit = 50): Promise<MercadoPagoLog[]> {
    return this.repo.list(configId, limit);
  }
}
