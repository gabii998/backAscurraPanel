import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { SummarizeIgTemplates } from "./SummarizeIgTemplates";

export class RetryTemplateSummary {
  constructor(
    private templateRepo: IgTemplateRepository,
    private summarize: SummarizeIgTemplates,
  ) {}

  async execute(brandId: string, templateId: string): Promise<void> {
    const template = await this.templateRepo.findById(templateId);
    if (!template || template.brandId !== brandId) throw new Error("TEMPLATE_NOT_FOUND");
    if (template.generationStatus !== "done" || !template.html) throw new Error("TEMPLATE_NOT_READY");

    // Force back to pending regardless of the current status — this is the manual escape
    // hatch for a template stuck showing a bad summary (e.g. one summarized before its real
    // html existed, back when findPendingSummary() didn't filter on generationStatus), which
    // sits at summaryStatus "done" and would otherwise never be picked up again automatically.
    await this.templateRepo.update(templateId, { summary: "", summaryStatus: "pending", summaryError: "", summaryBatchId: null, openAiKeySnapshot: null });
    await this.summarize.execute([templateId], brandId);
  }
}
