import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { Brand } from "../../domain/entities/Brand";

export class ListBrands {
  constructor(private repo: BrandRepository) {}

  async execute(): Promise<Brand[]> {
    return this.repo.findAll();
  }
}
