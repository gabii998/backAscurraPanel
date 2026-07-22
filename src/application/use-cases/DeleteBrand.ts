import type { BrandRepository } from "../../domain/repositories/BrandRepository";

export class DeleteBrand {
  constructor(private repo: BrandRepository) {}

  async execute(id: string): Promise<void> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new Error("BRAND_NOT_FOUND");
    return this.repo.delete(id);
  }
}
