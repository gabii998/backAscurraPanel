import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
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
  referencePostIds?: string[];
  styleReferenceIds?: string[];
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
    const { brandId, quantity, topic, forceTemplateId, referencePostIds = [], styleReferenceIds = referencePostIds, contentAssetIds = [], campaignContext } = input;

    if (quantity < 1 || quantity > 50) throw new Error("INVALID_QUANTITY");

    const brand = await this.brandRepo.findById(brandId);
    if (!brand) throw new Error("BRAND_NOT_FOUND");

    const allTemplates = await this.templateRepo.findByBrandId(brandId);
    const readyTemplates = allTemplates.filter(t => t.summaryStatus === "done" || t.summary);
    const colorPalette = Array.isArray(brand.colorPalette) ? brand.colorPalette : [];

    const templatesForPrompt = forceTemplateId
      ? readyTemplates.filter(t => t.id === forceTemplateId)
      : readyTemplates;

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
      prisma.igExamplePost.findMany({ where: { brandId, id: { in: styleReferenceIds }, assetType: "style_reference", summaryStatus: "done" }, select: { id: true, styleSummary: true } }),
      prisma.igExamplePost.findMany({ where: { brandId, id: { in: contentAssetIds }, assetType: { in: ["product", "system_screenshot", "brand_asset"] } }, select: { id: true, assetType: true, title: true, description: true, imageUrl: true, isPrimaryLogo: true } }),
    ]);
    const uniqueStyleIds = [...new Set(styleReferenceIds)];
    const uniqueAssetIds = [...new Set(contentAssetIds)];
    if (styleReferenceIds.length !== uniqueStyleIds.length || contentAssetIds.length !== uniqueAssetIds.length || examplePosts.length !== uniqueStyleIds.length || contentAssets.length !== uniqueAssetIds.length || uniqueAssetIds.length > 3) throw new Error("INVALID_REFERENCE_POSTS");
    const requiredAssetVariables = contentAssets.map((_, index) => `assetImageUrl${index + 1}`);
    const logoUrl = brand.logoUrl || "";
    const requiredVariables = [...requiredAssetVariables, ...(logoUrl ? ["brandLogoUrl"] : [])];
    const compatibleTemplates = requiredVariables.length === 0
      ? templatesForPrompt
      : templatesForPrompt.filter(template => requiredVariables.every(variable => template.variables.includes(variable)));
    if (forceTemplateId && compatibleTemplates.length === 0) throw new Error("TEMPLATE_NOT_ASSET_COMPATIBLE");

    const systemPrompt = buildSystemPrompt(
      brand,
      compatibleTemplates,
      colorPalette,
      approvedPosts.slice(0, 5),
      rejectedPosts,
      learning?.insightStatus === "done" ? learning.insights : null,
      examplePosts,
      contentAssets,
      campaignContext,
      brand.companyContext as Record<string, string | undefined>,
      topHashtags(approvedPosts),
    );

    const requests = Array.from({ length: quantity }, (_, i) => ({
      customId: `post-${i}`,
      systemPrompt,
      userPrompt: buildUserPrompt(topic, CONTENT_FORMATS[i % CONTENT_FORMATS.length]),
    }));

    const openAI = await resolveOpenAIService(brandId);
    const batchId = await openAI.submitBatch(requests);

    const job = await this.jobRepo.create({
      brandId,
      openAiBatchId: batchId,
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
  brand: { name: string; industry: string; acknowledge: string; voice: string; typography?: { primary?: string; secondary?: string; googleFontsUrl?: string } },
  templates: Array<{ id: string; name: string; summary: string; variables: string[] }>,
  colorPalette: string[],
  approvedPosts: Array<{ caption: string; hashtags: string[]; igReach: number; igEngagement: number; igSaved: number; igSyncedAt: Date | null; template: { name: string } | null }>,
  rejectedPosts: Array<{ caption: string; rejectReason: string }>,
  insights: string | null,
  examplePosts: Array<{ styleSummary: string }>,
  contentAssets: Array<{ assetType: string; title: string; description: string; imageUrl: string; isPrimaryLogo: boolean }>,
  campaignContext: string | undefined,
  companyContext: Record<string, string | undefined>,
  brandHashtags: string[],
): string {
  const templateList = templates.length > 0
    ? JSON.stringify(templates.map(t => ({
        id: t.id,
        name: t.name,
        summary: t.summary,
        variables: t.variables,
      })), null, 2)
    : "[]";

  let contextSection = "";

  if (examplePosts.length > 0) {
    const lines = examplePosts.map(p => `- ${p.styleSummary}`).join("\n");
    contextSection += `\n📌 Referencias seleccionadas de la marca (estilo objetivo):\n${lines}\n`;
  }
  if (contentAssets.length > 0) {
    contextSection += `\n🖼️ Assets de contenido seleccionados (usá las URLs solo como valores de assetImageUrl1..3, nunca en HTML):\n${contentAssets.map((asset, index) => `- assetImageUrl${index + 1}: ${asset.imageUrl}; tipo: ${asset.assetType}; título: ${asset.title}; descripción: ${asset.description}`).join("\n")}\n`;
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

  const typography = brand.typography ?? {};
  const typographySection = [
    `- Fuente principal: ${typography.primary || "sin especificar"}`,
    typography.secondary ? `- Fuente secundaria: ${typography.secondary}` : null,
    typography.googleFontsUrl ? `- Importar con: <link href="${typography.googleFontsUrl}" rel="stylesheet">` : null,
  ].filter(Boolean).join("\n");

  const htmlFontRule = typography.googleFontsUrl
    ? `- Si generás templateHtml, incluí el <link> de Google Fonts en el <head> y usá las fuentes de la marca en los estilos CSS.`
    : `- Si generás templateHtml, usá las fuentes del sistema o las fuentes de la marca si están especificadas.`;

  return `Sos un experto en social media para la marca "${brand.name}" (${brand.industry || "general"}).
Descripción de la marca: ${brand.acknowledge || "No especificada"}
Voz de la marca: ${brand.voice || "No especificada"}
Paleta de colores: ${JSON.stringify(colorPalette)}
Tipografía de la marca:
${typographySection}

Templates disponibles (solo elegir por ID, NO generarás el HTML a menos que sea necesario):
${templateList}
${contextSection}
Reglas:
- Elegí el templateId más apropiado para el post según la descripción del template.
- Si no hay templates disponibles o ninguno aplica, devolvé templateId: null y generá templateHtml (HTML/CSS completo, formato cuadrado 1080x1080px, usando los colores de la marca como variables CSS, con placeholders {{variable}} para el contenido dinámico) y templateName con un nombre descriptivo.
- El HTML generado debe incluir: estilos inline o <style>, no referencias a archivos externos salvo Google Fonts si la marca lo tiene configurado.
- ${htmlFontRule}
- Si usás assets, usá placeholders {{assetImageUrl1}}, {{assetImageUrl2}} o {{assetImageUrl3}}. Nunca escribas una URL fija en templateHtml.
- Devolvé SOLO JSON válido, sin texto adicional ni markdown.

Schema de respuesta:
{
  "caption": "string",
  "hashtags": ["string"],
  "templateId": "string | null",
  "templateHtml": "string | null",
  "templateName": "string | null",
  "variables": { "key": "value" }
}`;
}

function buildUserPrompt(topic?: string, format?: string): string {
  const topicPart = topic ? ` sobre: ${topic}` : " relevante para la marca";
  const formatPart = format ? ` Formato: ${format}.` : "";
  return `Generá un post de Instagram${topicPart}.${formatPart}`;
}
