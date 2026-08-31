import type { Brand, BrandTypography, CompanyContext } from "../entities/Brand";

export interface BrandCreateData {
  name: string;
  industry?: string;
  acknowledge?: string;
  voice?: string;
  colorPalette?: string[];
  typography?: BrandTypography;
  logoUrl?: string;
  companyContext?: CompanyContext;
}

export interface BrandUpdateData {
  name?: string;
  industry?: string;
  acknowledge?: string;
  voice?: string;
  colorPalette?: string[];
  typography?: BrandTypography;
  logoUrl?: string;
  igUserId?: string;
  igAccessToken?: string;
  openAiApiKey?: string;
  openAiModel?: string;
  companyContext?: CompanyContext;
}

export interface BrandRepository {
  create(data: BrandCreateData): Promise<Brand>;
  findAll(): Promise<Brand[]>;
  findById(id: string): Promise<Brand | null>;
  update(id: string, data: BrandUpdateData): Promise<Brand>;
  delete(id: string): Promise<void>;
}
