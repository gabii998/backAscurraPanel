import type { IgTemplateGenerationJobRepository } from "../../domain/repositories/IgTemplateGenerationJobRepository";
import type { IgTemplateGenerationJob } from "../../domain/entities/IgTemplateGenerationJob";

export class ListIgTemplateGenerationJobs {
  constructor(private repo: IgTemplateGenerationJobRepository) {}

  async execute(brandId: string): Promise<IgTemplateGenerationJob[]> {
    return this.repo.findByBrandId(brandId);
  }
}
