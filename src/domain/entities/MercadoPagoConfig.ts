export interface MercadoPagoConfig {
  id: string;
  name: string;
  accessToken: string;
  publicKey: string;
  webhookUrl: string;
  backUrlSuccess: string;
  backUrlFailure: string;
  backUrlPending: string;
  apiKeyId: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export type MercadoPagoConfigInput = Omit<MercadoPagoConfig, "id" | "updatedAt" | "createdAt" | "apiKeyId"> & {
  apiKeyId?: string | null;
};
