import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";

export class DeleteIgTemplate {
  constructor(private repo: IgTemplateRepository) {}

  async execute(id: string): Promise<void> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new Error("TEMPLATE_NOT_FOUND");
    return this.repo.delete(id);
  }
}
