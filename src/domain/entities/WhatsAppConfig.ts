export interface WhatsAppConfig {
  id: string;
  name: string;
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessAccountId: string | null;
  apiKeyId: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export type WhatsAppConfigPublic = Omit<WhatsAppConfig, "accessToken" | "webhookVerifyToken">;

export type WhatsAppConfigInput = Omit<WhatsAppConfig, "id" | "updatedAt" | "createdAt" | "apiKeyId"> & {
  apiKeyId?: string | null;
};
