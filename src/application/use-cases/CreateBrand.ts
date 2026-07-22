import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { Brand } from "../../domain/entities/Brand";

export interface CreateBrandInput {
  name: string;
  industry?: string;
  acknowledge?: string;
  voice?: string;
  colorPalette?: string[];
  logoUrl?: string;
}

export class CreateBrand {
  constructor(private repo: BrandRepository) {}

  async execute(input: CreateBrandInput): Promise<Brand> {
    if (!input.name) throw new Error("MISSING_FIELDS");
    return this.repo.create(input);
  }
}
