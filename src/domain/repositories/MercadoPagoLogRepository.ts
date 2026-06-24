import type { MercadoPagoLog } from "../entities/MercadoPagoLog";

export interface MercadoPagoLogRepository {
  create(log: Omit<MercadoPagoLog, "id" | "updatedAt" | "createdAt">): Promise<MercadoPagoLog>;
  list(configId: string, limit?: number): Promise<MercadoPagoLog[]>;
  getByExternalReference(externalReference: string, configId: string): Promise<MercadoPagoLog | null>;
  updateStatus(id: string, status: string, paymentId: string, amount: number): Promise<void>;
}
