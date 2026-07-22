import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplate } from "../../domain/entities/IgTemplate";

export interface CreateIgTemplateInput {
  brandId: string;
  name: string;
  html: string;
  variables: string[];
  isAiGenerated?: boolean;
}

export class CreateIgTemplate {
  constructor(private repo: IgTemplateRepository) {}

  async execute(input: CreateIgTemplateInput): Promise<IgTemplate> {
    if (!input.name || !input.html) throw new Error("MISSING_FIELDS");
    return this.repo.create({
      brandId: input.brandId,
      name: input.name,
      html: input.html,
      variables: input.variables,
      isAiGenerated: input.isAiGenerated ?? false,
    });
  }
}
