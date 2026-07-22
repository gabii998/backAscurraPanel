import type { BrandRepository, BrandUpdateData } from "../../domain/repositories/BrandRepository";
import type { Brand } from "../../domain/entities/Brand";

export class UpdateBrand {
  constructor(private repo: BrandRepository) {}

  async execute(id: string, data: BrandUpdateData): Promise<Brand> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new Error("BRAND_NOT_FOUND");
    return this.repo.update(id, data);
  }
}
