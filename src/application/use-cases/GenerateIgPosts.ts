import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplate } from "../../domain/entities/IgTemplate";
import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { IgBatchJob } from "../../domain/entities/IgBatchJob";
import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export interface GenerateIgPostsInput {
  brandId: string;
  quantity: number;
  topic?: string;
  forceTemplateId?: string;
  contentAssetIds?: string[];
  campaignContext?: string;
}

export class GenerateIgPosts {
  constructor(
    private brandRepo:    BrandRepository,
    private templateRepo: IgTemplateRepository,
    private postRepo:     IgPostRepository,
    private jobRepo:      IgBatchJobRepository,
  ) {}

  async execute(input: GenerateIgPostsInput): Promise<IgBatchJob> {
    const { brandId, quantity, topic, forceTemplateId, contentAssetIds = [], campaignContext } = input;

    if (quantity < 1 || quantity > 50) throw new Error("INVALID_QUANTITY");

    const brand = await this.brandRepo.findById(brandId);
    if (!brand) throw new Error("BRAND_NOT_FOUND");

    const allTemplates = await this.templateRepo.findByBrandId(brandId);
    const readyTemplates = allTemplates.filter(t => (t.summaryStatus === "done" || t.summary) && t.generationStatus === "done");
    if (readyTemplates.length === 0) throw new Error("NO_TEMPLATES_AVAILABLE");

    const [approvedPosts, rejectedPosts, learning, examplePosts, contentAssets] = await Promise.all([
      prisma.igPost.findMany({
        where: { brandId, status: "approved" },
        orderBy: { approvedAt: "desc" },
        take: 10,
        select: { caption: true, hashtags: true, igReach: true, igEngagement: true, igSaved: true, igSyncedAt: true, template: { select: { name: true } } },
      }),
      prisma.igPost.findMany({
        where: { brandId, status: "rejected", rejectReason: { not: "" } },
        orderBy: { rejectedAt: "desc" },
        take: 3,
        select: { caption: true, rejectReason: true },
      }),
      prisma.brandLearning.findUnique({ where: { brandId } }),
      // Style references are always-on standing context (like companyContext or brand
      // hashtags) rather than something picked per batch — the brand's writing voice
      // shouldn't be optional. Capped and most-recent-first to bound prompt growth.
      prisma.igExamplePost.findMany({ where: { brandId, assetType: "style_reference", summaryStatus: "done" }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, styleSummary: true } }),
      prisma.igExamplePost.findMany({ where: { brandId, id: { in: contentAssetIds }, assetType: { in: ["product", "system_screenshot", "brand_asset"] } }, select: { id: true, assetType: true, title: true, description: true, imageUrl: true, isPrimaryLogo: true } }),
    ]);
    const uniqueAssetIds = [...new Set(contentAssetIds)];
    if (contentAssetIds.length !== uniqueAssetIds.length || contentAssets.length !== uniqueAssetIds.length || uniqueAssetIds.length > 3) throw new Error("INVALID_REFERENCE_POSTS");

    const logoUrl = brand.logoUrl || "";

    // Templates are a curated, pre-generated library (see GenerateIgTemplates) — post
    // generation never authors a new layout, it only ever fills an existing template's
    // {{variable}} placeholders. When no template has an exact asset-slot match, we pick
    // the best available fit (most usable slots, fewest empty leftover slots) instead of
    // erroring or inventing one; any selected content asset beyond the chosen template's
    // slots is simply not referenced (see the assetUrls spread in CheckBatchStatus).
    let templatesForPrompt: IgTemplate[];
    if (forceTemplateId) {
      const forced = readyTemplates.find(t => t.id === forceTemplateId);
      if (!forced) throw new Error("TEMPLATE_NOT_FOUND");
      templatesForPrompt = [forced];
    } else {
      templatesForPrompt = selectBestFitTemplates(readyTemplates, contentAssets.length);
    }

    const systemPrompt = buildSystemPrompt(
      brand,
      templatesForPrompt,
      approvedPosts.slice(0, 5),
      rejectedPosts,
      learning?.insightStatus === "done" ? learning.insights : null,
      examplePosts,
      contentAssets,
      campaignContext,
      brand.companyContext as Record<string, string | undefined>,
      topHashtags(approvedPosts),
      logoUrl,
    );

    const requests = Array.from({ length: quantity }, (_, i) => ({
      customId: `post-${i}`,
      systemPrompt,
      userPrompt: buildUserPrompt(topic, CONTENT_FORMATS[i % CONTENT_FORMATS.length]),
      responseFormat: "json" as const,
    }));

    const { service: openAI, keySnapshot } = await resolveOpenAIService(brandId);
    const batchId = await openAI.submitBatch(requests);

    const job = await this.jobRepo.create({
      brandId,
      openAiBatchId: batchId,
      openAiKeySnapshot: keySnapshot,
      prompt: systemPrompt,
      status: "processing",
      postCount: quantity,
      contentAssetIds: uniqueAssetIds,
      brandLogoUrl: logoUrl,
    });

    await this.postRepo.createMany(
      requests.map(() => ({
        brandId,
        batchJobId: job.id,
        caption: "",
        hashtags: [],
        variables: {},
        status: "generating" as const,
      })),
    );

    return job;
  }
}

// Ranks templates by how well they cover the requested content-asset slots:
// (1) maximize usableSlots — how many of the real selected assets this template can place;
// (2) tiebreak on minimizing overProvisioned — avoid leaving visible empty {{assetImageUrlN}} holes.
// All templates tied on both are returned so the model can still pick among them by content/style fit.
function selectBestFitTemplates(templates: IgTemplate[], requiredCount: number): IgTemplate[] {
  if (templates.length === 0) return [];
  const ranked = templates.map(template => {
    const slotCount = template.variables.filter(v => /^assetImageUrl\d+$/.test(v)).length;
    return {
      template,
      usableSlots: Math.min(slotCount, requiredCount),
      overProvisioned: Math.max(0, slotCount - requiredCount),
    };
  });
  const maxUsable = Math.max(...ranked.map(r => r.usableSlots));
  const bestTier = ranked.filter(r => r.usableSlots === maxUsable);
  const minOverProvisioned = Math.min(...bestTier.map(r => r.overProvisioned));
  return bestTier.filter(r => r.overProvisioned === minOverProvisioned).map(r => r.template);
}

const CONTENT_FORMATS = [
  "educativo (dato útil o tip relacionado con la marca)",
  "promocional (destacar un producto o servicio concreto)",
  "comunidad (conectar emocionalmente con la audiencia)",
  "detrás de escena (mostrar el proceso o equipo de la marca)",
  "pregunta o encuesta (generar interacción)",
];

function topHashtags(posts: { hashtags: string[] }[], limit = 15): string[] {
  const freq = new Map<string, number>();
  for (const p of posts) for (const h of p.hashtags) freq.set(h, (freq.get(h) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(e => e[0]);
}

function buildSystemPrompt(
  brand: { name: string; industry: string; acknowledge: string; voice: string },
  templates: Array<{ id: string; name: string; summary: string; variables: string[] }>,
  approvedPosts: Array<{ caption: string; hashtags: string[]; igReach: number; igEngagement: number; igSaved: number; igSyncedAt: Date | null; template: { name: string } | null }>,
  rejectedPosts: Array<{ caption: string; rejectReason: string }>,
  insights: string | null,
  examplePosts: Array<{ styleSummary: string }>,
  contentAssets: Array<{ assetType: string; title: string; description: string; imageUrl: string; isPrimaryLogo: boolean }>,
  campaignContext: string | undefined,
  companyContext: Record<string, string | undefined>,
  brandHashtags: string[],
  logoUrl: string,
): string {
  const templateList = JSON.stringify(templates.map(t => ({
    id: t.id,
    name: t.name,
    summary: t.summary,
    variables: t.variables,
  })), null, 2);

  let contextSection = "";

  if (examplePosts.length > 0) {
    const lines = examplePosts.map(p => `- ${p.styleSummary}`).join("\n");
    contextSection += `\n📌 Referencias de estilo de la marca (guía ABSTRACTA únicamente: composición, paleta, tono, jerarquía. No viste la imagen real de estas referencias, solo esta descripción. NO inventes, menciones ni representes contenido visual concreto a partir de ellas — nada de capturas de pantalla, paneles de interfaz, gráficos de datos ni imágenes específicas. El único contenido visual permitido es el de los assets de contenido provistos explícitamente abajo, si los hay):\n${lines}\n`;
  }
  if (contentAssets.length > 0) {
    contextSection += `\n🖼️ Assets de contenido seleccionados (usá las URLs solo como valores de assetImageUrl1..3, nunca en HTML):\n${contentAssets.map((asset, index) => `- assetImageUrl${index + 1}: ${asset.imageUrl}; tipo: ${asset.assetType}; título: ${asset.title}; descripción: ${asset.description}`).join("\n")}\nEl template elegido puede tener menos slots {{assetImageUrlN}} que assets provistos: en ese caso el asset excedente no se usa, no lo menciones en el caption ni asumas que va a aparecer visualmente.\n`;
  }
  if (logoUrl) {
    contextSection += `\n🖼️ Logo de la marca disponible en la variable {{brandLogoUrl}} (usalo si el template elegido tiene esa variable).\n`;
  }
  if (campaignContext?.trim()) contextSection += `\n📣 Contexto temporal de campaña: ${campaignContext.trim()}\n`;
  const companyLines = Object.entries(companyContext).filter(([, value]) => value?.trim()).map(([key, value]) => `- ${key}: ${value}`).join("\n");
  if (companyLines) contextSection += `\n🏢 Contexto estable de la empresa:\n${companyLines}\n`;

  if (brandHashtags.length > 0) {
    contextSection += `\n#️⃣ Hashtags que funcionan para esta marca (usar y complementar con nuevos):\n${brandHashtags.join(" ")}\n`;
  }

  if (approvedPosts.length > 0) {
    const lines = approvedPosts.map(p => {
      const tpl = p.template?.name ? ` [template: ${p.template.name}]` : "";
      const metrics = p.igSyncedAt
        ? ` (reach: ${p.igReach}, engagement: ${p.igEngagement}, guardados: ${p.igSaved})`
        : "";
      return `- "${p.caption}"${tpl}${metrics}`;
    }).join("\n");
    contextSection += `\n✓ Posts recientes APROBADOS (ejemplos de qué funciona):\n${lines}\n`;
  }

  if (rejectedPosts.length > 0) {
    const lines = rejectedPosts.map(p => `- Motivo: "${p.rejectReason}" → "${p.caption}"`).join("\n");
    contextSection += `\n✗ Posts recientes RECHAZADOS (qué evitar):\n${lines}\n`;
  }

  if (insights) {
    contextSection += `\n💡 Patrones aprendidos de esta marca:\n${insights}\n`;
  }

  return `Sos un experto en social media para la marca "${brand.name}" (${brand.industry || "general"}).
Descripción de la marca: ${brand.acknowledge || "No especificada"}
Voz de la marca: ${brand.voice || "No especificada"}

Templates disponibles (elegí siempre uno de estos por ID — el diseño visual ya está resuelto en el template, vos solo aportás el contenido):
${templateList}
${contextSection}
CONTENIDO:
- Elegí siempre uno de los templateId provistos arriba, el más apropiado para el post según la descripción del template. Nunca devuelvas templateId: null ni inventes un layout nuevo.
- Completá el objeto "variables" con un valor para cada placeholder {{variable}} que declare el template elegido (según su lista "variables"), excepto los assetImageUrlN y brandLogoUrl que ya se completan automáticamente.
- ${contentAssets.length > 0 ? `Hay ${contentAssets.length} asset(s) de contenido disponible(s) (assetImageUrl1${contentAssets.length > 1 ? `..${contentAssets.length}` : ""}).` : "No hay assets de contenido seleccionados para este post."}
- Devolvé SOLO JSON válido, sin texto adicional ni markdown.

Schema de respuesta:
{
  "caption": "string",
  "hashtags": ["string"],
  "templateId": "string",
  "variables": { "key": "value" }
}`;
}

function buildUserPrompt(topic?: string, format?: string): string {
  const topicPart = topic ? ` sobre: ${topic}` : " relevante para la marca";
  const formatPart = format ? ` Formato: ${format}.` : "";
  return `Generá un post de Instagram${topicPart}.${formatPart}`;
}
