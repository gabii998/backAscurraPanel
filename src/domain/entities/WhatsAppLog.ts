export interface WhatsAppLog {
  id: string;
  configId: string;
  method: string;
  request: string;
  response: string;
  status: string;
  error: string;
  durationMs: number;
  createdAt: Date;
}
