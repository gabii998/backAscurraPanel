export interface MailConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  apiKeyId: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export type MailConfigInput = Omit<MailConfig, "id" | "updatedAt" | "createdAt" | "apiKeyId"> & {
  apiKeyId?: string | null;
};
