import type { MercadoPagoConfig } from "../entities/MercadoPagoConfig";

export type MercadoPagoConfigInput = Omit<MercadoPagoConfig, "id" | "updatedAt" | "createdAt">;

export interface MercadoPagoConfigRepository {
  list(): Promise<MercadoPagoConfig[]>;
  getById(id: string): Promise<MercadoPagoConfig | null>;
  getByName(name: string): Promise<MercadoPagoConfig | null>;
  getByApiKeyId(apiKeyId: string): Promise<MercadoPagoConfig | null>;
  create(data: MercadoPagoConfigInput): Promise<MercadoPagoConfig>;
  update(id: string, data: Partial<MercadoPagoConfigInput>): Promise<MercadoPagoConfig>;
  delete(id: string): Promise<void>;
}
