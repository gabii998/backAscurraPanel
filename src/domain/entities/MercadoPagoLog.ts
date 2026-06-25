export interface MercadoPagoLog {
  id: string;
  configId: string;
  externalReference: string;
  preferenceId: string;
  paymentId: string;
  webhookUrl: string;
  checkoutUrl: string;
  status: string;
  amount: number;
  currency: string;
  error: string;
  updatedAt: Date;
  createdAt: Date;
}
