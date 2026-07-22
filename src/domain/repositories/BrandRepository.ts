import type { Brand } from "../entities/Brand";

export interface BrandCreateData {
  name: string;
  industry?: string;
  acknowledge?: string;
  voice?: string;
  colorPalette?: string[];
  logoUrl?: string;
}

export interface BrandUpdateData {
  name?: string;
  industry?: string;
  acknowledge?: string;
  voice?: string;
  colorPalette?: string[];
  logoUrl?: string;
  igUserId?: string;
  igAccessToken?: string;
  openAiApiKey?: string;
  openAiModel?: string;
}

export interface BrandRepository {
  create(data: BrandCreateData): Promise<Brand>;
  findAll(): Promise<Brand[]>;
  findById(id: string): Promise<Brand | null>;
  update(id: string, data: BrandUpdateData): Promise<Brand>;
  delete(id: string): Promise<void>;
}
