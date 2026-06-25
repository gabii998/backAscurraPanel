export interface ArcaConfig {
  id: string;
  name: string;
  cuit: string;
  cert: string;
  privateKey: string;
  production: boolean;
  apiKeyId: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export type ArcaConfigInput = Omit<ArcaConfig, "id" | "updatedAt" | "createdAt" | "apiKeyId"> & { apiKeyId?: string | null };

export type ArcaConfigPublic = Omit<ArcaConfig, "cert" | "privateKey">;
