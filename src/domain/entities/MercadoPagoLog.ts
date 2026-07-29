export interface MercadoPagoLog {
  id: string;
  configId: string;
  externalReference: string;
  preferenceId: string;
  paymentId: string;
  checkoutUrl: string;
  status: string;
  amount: number;
  currency: string;
  request?: unknown;
  response?: unknown;
  webhookPayload?: unknown;
  forwardStatusCode?: number | null;
  forwardResponse: string;
  error: string;
  updatedAt: Date;
  createdAt: Date;
}
