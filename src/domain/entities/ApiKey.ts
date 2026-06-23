export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  createdAt: Date;
  revokedAt: Date | null;
}
