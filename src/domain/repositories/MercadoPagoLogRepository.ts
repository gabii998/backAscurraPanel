import type { MercadoPagoLog } from "../entities/MercadoPagoLog";

export interface MercadoPagoLogRepository {
  create(log: Omit<MercadoPagoLog, "id" | "updatedAt" | "createdAt">): Promise<MercadoPagoLog>;
  list(configId: string, limit?: number): Promise<MercadoPagoLog[]>;
  getByExternalReference(externalReference: string, configId: string): Promise<MercadoPagoLog | null>;
  updateStatus(id: string, data: {
    status: string;
    paymentId: string;
    amount: number;
    currency: string;
    webhookPayload: unknown;
    paymentResponse: unknown;
    forwardStatusCode?: number | null;
    forwardResponse?: string;
  }): Promise<void>;
}
