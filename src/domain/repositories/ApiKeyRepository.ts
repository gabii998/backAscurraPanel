import type { ApiKey } from "../entities/ApiKey";

export interface ApiKeyRepository {
  findByKeyHash(hash: string): Promise<ApiKey | null>;
  list(): Promise<ApiKey[]>;
  create(key: ApiKey): Promise<ApiKey>;
  revoke(id: string): Promise<boolean>;
}
