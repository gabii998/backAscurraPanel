import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { OpenAIBatchService } from "../services/OpenAIBatchService";

const SUMMARIZE_SYSTEM = `Describí este template HTML para Instagram en máximo 2 oraciones. Incluí: estilo visual, tipo de contenido para el que es ideal, qué transmite visualmente. No menciones código ni variables. Respondé SOLO con el texto, sin markdown.`;

export class SummarizeIgTemplates {
  constructor(
    private templateRepo: IgTemplateRepository,
    private openAI:       OpenAIBatchService,
  ) {}

  async execute(templateIds?: string[]): Promise<{ submittedCount: number; batchId: string | null }> {
    const pending = await this.templateRepo.findPendingSummary();
    const toProcess = templateIds
      ? pending.filter(t => templateIds.includes(t.id))
      : pending;

    if (toProcess.length === 0) return { submittedCount: 0, batchId: null };

    const requests = toProcess.map(t => ({
      customId: `summary-${t.id}`,
      systemPrompt: SUMMARIZE_SYSTEM,
      userPrompt: `HTML del template:\n${t.html}`,
    }));

    const batchId = await this.openAI.submitBatch(requests);

    await Promise.all(
      toProcess.map(t =>
        this.templateRepo.update(t.id, { summaryStatus: "processing" }),
      ),
    );

    return { submittedCount: toProcess.length, batchId };
  }
}
