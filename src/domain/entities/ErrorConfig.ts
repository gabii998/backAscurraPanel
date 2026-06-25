export interface ErrorConfig {
  id: string;
  name: string;
  apiKeyId: string | null;
  createdAt: Date;
}

export interface ErrorConfigDetail extends ErrorConfig {
  apiKeyPrefix: string | null;
  errorCount: number;
}
