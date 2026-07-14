export interface ArcaApiKeyRef {
  id: string;
  name: string;
}

export interface ArcaConfig {
  id: string;
  name: string;
  cuit: string;
  cert: string;
  privateKey: string;
  production: boolean;
  certExpiresAt: Date | null;
  certExpiryNotifiedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

export type ArcaConfigInput = Omit<ArcaConfig, "id" | "updatedAt" | "createdAt" | "certExpiresAt" | "certExpiryNotifiedAt">;

export type ArcaConfigPublic = Omit<ArcaConfig, "cert" | "privateKey" | "certExpiryNotifiedAt"> & {
  apiKeys: ArcaApiKeyRef[];
};
