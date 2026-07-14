export interface ArcaLog {
  id: string;
  configId: string;
  service: string;
  method: string;
  request: string;
  response: string;
  status: string;
  error: string;
  durationMs: number;
  idempotencyKey: string | null;
  updatedAt: Date;
  createdAt: Date;
}
