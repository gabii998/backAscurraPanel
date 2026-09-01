import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";
import type { IgExamplePost } from "../../domain/entities/IgExamplePost";

export class RetryIgExampleSummary {
  async execute(brandId: string, exampleId: string): Promise<IgExamplePost> {
    const example = await prisma.igExamplePost.findFirst({ where: { id: exampleId, brandId } });
    if (!example) throw new Error("EXAMPLE_NOT_FOUND");
    if (example.assetType !== "style_reference" || !example.imageUrl) throw new Error("INVALID_STYLE_REFERENCE");

    await prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryStatus: "processing", summaryError: "", summaryBatchId: null } });
    try {
      const batchId = await (await resolveOpenAIService(brandId)).submitBatch([{
        customId: `example-summary-${example.id}`,
        systemPrompt: "Analizá esta referencia de Instagram. Respondé SOLO JSON válido con summary. Describí ÚNICAMENTE patrones abstractos: composición, paleta, jerarquía, tono, longitud, emojis, puntuación y estructura. No transcribas ni menciones texto visible, temas, marcas, productos, ofertas, hashtags, frases ni CTAs.",
        userPrompt: "Generá una ficha abstracta de estilo, sin conservar contenido de la publicación.",
        imageUrl: example.imageUrl,
        responseFormat: "json",
      }]);
      return prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryBatchId: batchId, summaryStatus: "processing" } });
    } catch {
      return prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryStatus: "failed", summaryError: "STYLE_ANALYSIS_UNAVAILABLE" } });
    }
  }
}
