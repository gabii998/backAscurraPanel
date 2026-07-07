export interface MercadoPagoConfig {
  id: string;
  name: string;
  accessToken: string;
  publicKey: string;
  webhookUrl: string;
  backUrlSuccess: string;
  backUrlFailure: string;
  backUrlPending: string;
  updatedAt: Date;
  createdAt: Date;
}
