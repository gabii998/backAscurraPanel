import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export class SynthesizeBrandLearning {
  async execute(brandId: string): Promise<{ batchId: string }> {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new Error("BRAND_NOT_FOUND");

    const [approvedPosts, rejectedPosts] = await Promise.all([
      prisma.igPost.findMany({
        where: { brandId, status: "approved" },
        orderBy: { igEngagement: "desc" },
        take: 30,
        select: { caption: true, igReach: true, igEngagement: true, igSaved: true, igSyncedAt: true },
      }),
      prisma.igPost.findMany({
        where: { brandId, status: "rejected", rejectReason: { not: "" } },
        orderBy: { rejectedAt: "desc" },
        take: 15,
        select: { caption: true, rejectReason: true },
      }),
    ]);

    const approvedText = approvedPosts.map(p => {
      const metrics = p.igSyncedAt ? ` [reach: ${p.igReach}, engagement: ${p.igEngagement}, guardados: ${p.igSaved}]` : "";
      return `- "${p.caption}"${metrics}`;
    }).join("\n") || "(ninguno aún)";
    const rejectedText = rejectedPosts.map(p => `- Motivo: "${p.rejectReason}" → "${p.caption}"`).join("\n") || "(ninguno aún)";

    const systemPrompt = `Sos un experto en social media. Analizá los siguientes posts aprobados y rechazados de la marca "${brand.name}". Algunos posts tienen métricas reales de Instagram (reach, engagement, guardados) — dales más peso en tu análisis. Identificá 3 a 5 patrones concretos sobre qué tipo de contenido, tono o estructura funciona mejor para esta marca. Sé específico y accionable. Máximo 200 palabras. SOLO el texto de los patrones, sin listas markdown ni encabezados.`;

    const userPrompt = `Posts APROBADOS (ordenados por engagement descendente):\n${approvedText}\n\nPosts RECHAZADOS (con motivo de rechazo):\n${rejectedText}`;

    const { service: openAI, keySnapshot } = await resolveOpenAIService(brandId);
    const batchId = await openAI.submitBatch([{
      customId: `synthesis-${brandId}`,
      systemPrompt,
      userPrompt,
    }]);

    await prisma.brandLearning.upsert({
      where: { brandId },
      create: {
        brandId,
        insightStatus: "processing",
        openAiBatchId: batchId,
        openAiKeySnapshot: keySnapshot,
      },
      update: {
        insightStatus: "processing",
        openAiBatchId: batchId,
        openAiKeySnapshot: keySnapshot,
      },
    });

    return { batchId };
  }
}
