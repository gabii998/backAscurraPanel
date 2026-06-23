export interface ErrorConfig {
  id: string;
  name: string;
  projectId: string | null;
  apiKeyId: string | null;
  createdAt: Date;
}

export interface ErrorConfigDetail extends ErrorConfig {
  projectName: string | null;
  apiKeyPrefix: string | null;
  errorCount: number;
}
