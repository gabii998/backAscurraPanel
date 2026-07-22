import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplate } from "../../domain/entities/IgTemplate";

export interface UpdateIgTemplateInput {
  name?: string;
  html?: string;
  variables?: string[];
}

export class UpdateIgTemplate {
  constructor(private repo: IgTemplateRepository) {}

  async execute(id: string, input: UpdateIgTemplateInput): Promise<IgTemplate> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new Error("TEMPLATE_NOT_FOUND");
    return this.repo.update(id, { ...input, summary: "", summaryStatus: "pending" });
  }
}
