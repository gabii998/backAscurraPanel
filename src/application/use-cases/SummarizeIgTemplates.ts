import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

const SUMMARIZE_SYSTEM = `Describí este template HTML para Instagram en máximo 2 oraciones. Incluí: estilo visual, tipo de contenido para el que es ideal, qué transmite visualmente. No menciones código ni variables. Respondé SOLO con el texto, sin markdown.`;

export class SummarizeIgTemplates {
  constructor(private templateRepo: IgTemplateRepository) {}

  async execute(templateIds?: string[], brandId?: string): Promise<{ submittedCount: number; batchId: string | null }> {
    const pending = await this.templateRepo.findPendingSummary();
    const toProcess = templateIds
      ? pending.filter(t => templateIds.includes(t.id))
      : brandId
        ? pending.filter(t => t.brandId === brandId)
        : pending;

    if (toProcess.length === 0) return { submittedCount: 0, batchId: null };

    // findPendingSummary() is unscoped by brand, and a caller with no templateIds/brandId
    // (e.g. a cron sweep catching submissions the frontend's fire-and-forget trigger never
    // completed) can pull in pending templates from several brands at once. Each brand can
    // have its own OpenAI key/model, so every brand's batch must be submitted and resolved
    // separately — submitting them together under a single resolved service would silently
    // bill/analyze other brands' templates against the wrong brand's key.
    const byBrand = new Map<string, typeof toProcess>();
    for (const t of toProcess) {
      const group = byBrand.get(t.brandId) ?? [];
      group.push(t);
      byBrand.set(t.brandId, group);
    }

    let submittedCount = 0;
    let firstBatchId: string | null = null;
    for (const [groupBrandId, templates] of byBrand) {
      try {
        const requests = templates.map(t => ({
          customId: `summary-${t.id}`,
          systemPrompt: SUMMARIZE_SYSTEM,
          userPrompt: `HTML del template:\n${t.html}`,
        }));

        const { service: openAI, keySnapshot } = await resolveOpenAIService(groupBrandId);
        const batchId = await openAI.submitBatch(requests);

        await Promise.all(
          templates.map(t =>
            this.templateRepo.update(t.id, { summaryStatus: "processing", summaryBatchId: batchId, openAiKeySnapshot: keySnapshot }),
          ),
        );

        submittedCount += templates.length;
        firstBatchId ??= batchId;
      } catch (err) {
        // One brand failing to resolve (missing/rotated key, transient OpenAI error) must
        // not block every other brand's pending templates from being submitted — otherwise
        // a single brand's config problem stalls the whole sweep indefinitely.
        console.error(`SummarizeIgTemplates: failed to submit batch for brand ${groupBrandId}`, err);
      }
    }

    return { submittedCount, batchId: firstBatchId };
  }
}
