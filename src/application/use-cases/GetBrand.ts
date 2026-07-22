import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { Brand } from "../../domain/entities/Brand";

export class GetBrand {
  constructor(private repo: BrandRepository) {}

  async execute(id: string): Promise<Brand> {
    const brand = await this.repo.findById(id);
    if (!brand) throw new Error("BRAND_NOT_FOUND");
    return brand;
  }
}
