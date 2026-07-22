import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplate } from "../../domain/entities/IgTemplate";

export class ListIgTemplates {
  constructor(private repo: IgTemplateRepository) {}

  async execute(brandId: string): Promise<IgTemplate[]> {
    return this.repo.findByBrandId(brandId);
  }
}
