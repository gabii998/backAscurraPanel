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
    // The summary describes the HTML's visual design, so it only goes stale when the
    // HTML itself changes — a rename (or a variables-only edit) shouldn't force a
    // re-summarize and shouldn't knock a ready-to-use template back to "pending".
    const invalidatesSummary = input.html !== undefined && input.html !== exists.html;
    return this.repo.update(id, {
      ...input,
      ...(invalidatesSummary && { summary: "", summaryStatus: "pending" }),
    });
  }
}
