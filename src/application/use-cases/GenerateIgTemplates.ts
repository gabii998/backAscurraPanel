import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { IgTemplateRepository, IgTemplatePerformanceSummary } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplateGenerationJobRepository } from "../../domain/repositories/IgTemplateGenerationJobRepository";
import type { IgTemplateGenerationJob } from "../../domain/entities/IgTemplateGenerationJob";
import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";
import { TEMPLATE_GOLD_STANDARD_EXAMPLE } from "./igTemplateGoldStandardExample";

export interface GenerateIgTemplatesInput {
  brandId: string;
  quantity: number;
  styleDirection?: string;
  mode?: "create" | "iterate";
  baseTemplateId?: string;
}

const LAYOUT_ARCHETYPES: Record<number, string[]> = {
  0: [
    "texto centrado sobre fondo de color, sin imágenes de contenido",
    "cita o frase destacada tipográfica, sin imágenes",
  ],
  1: [
    "imagen de producto destacada en la mitad superior, texto abajo",
    "imagen de fondo completo con texto superpuesto en una franja",
  ],
  2: [
    "dos imágenes lado a lado con texto superpuesto",
    "una imagen grande arriba y una chica abajo, con texto entre ambas",
  ],
  3: [
    "collage de tres imágenes con texto mínimo",
    "una imagen principal grande y dos miniaturas secundarias, con texto",
  ],
};

export class GenerateIgTemplates {
  constructor(
    private brandRepo: BrandRepository,
    private templateRepo: IgTemplateRepository,
    private jobRepo: IgTemplateGenerationJobRepository,
  ) {}

  async execute(input: GenerateIgTemplatesInput): Promise<IgTemplateGenerationJob> {
    const { brandId, quantity, styleDirection, mode = "create", baseTemplateId } = input;

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 8) throw new Error("INVALID_QUANTITY");
    if (mode === "iterate" && !baseTemplateId) throw new Error("MISSING_BASE_TEMPLATE");

    const brand = await this.brandRepo.findById(brandId);
    if (!brand) throw new Error("BRAND_NOT_FOUND");

    let baseTemplate: { html: string; name: string } | null = null;
    let performance: IgTemplatePerformanceSummary | null = null;
    if (mode === "iterate" && baseTemplateId) {
      const found = await this.templateRepo.findById(baseTemplateId);
      if (!found) throw new Error("TEMPLATE_NOT_FOUND");
      baseTemplate = { html: found.html, name: found.name };
      performance = await this.templateRepo.getPerformanceSummary(baseTemplateId);
    }

    const colorPalette = Array.isArray(brand.colorPalette) ? brand.colorPalette : [];
    const logoUrl = brand.logoUrl || "";

    // Style references are the brand's own visual ground truth — without this, template
    // generation only ever saw an explicit hex colorPalette (if the brand bothered to set
    // one) and free-text styleDirection, so uploaded reference images had zero effect on
    // the templates actually generated, however consistent those references were.
    const [styleReferences, contentAssetCount] = await Promise.all([
      prisma.igExamplePost.findMany({
        where: { brandId, assetType: "style_reference", summaryStatus: "done" },
        orderBy: { createdAt: "desc" }, take: 8, select: { styleSummary: true },
      }),
      prisma.igExamplePost.count({ where: { brandId, assetType: { in: ["product", "system_screenshot", "brand_asset"] } } }),
    ]);
    const styleReferenceSummaries = styleReferences.map(s => s.styleSummary);
    const derivedPalette = colorPalette.length === 0 ? derivePaletteFromStyleSummaries(styleReferenceSummaries) : [];

    const systemPrompt = buildTemplateGenerationSystemPrompt(
      brand,
      colorPalette,
      derivedPalette,
      logoUrl,
      baseTemplate,
      performance,
      styleDirection,
      styleReferenceSummaries,
      brand.companyContext as Record<string, string | undefined>,
    );

    const requests = Array.from({ length: quantity }, (_, i) => {
      const slotCount = pickSlotCount(i, contentAssetCount);
      const archetypes = LAYOUT_ARCHETYPES[slotCount];
      const archetype = archetypes[i % archetypes.length];
      return {
        customId: `template-${i}`,
        systemPrompt,
        userPrompt: buildUserPrompt(slotCount, archetype),
        responseFormat: "json" as const,
      };
    });

    const { service: openAI, keySnapshot } = await resolveOpenAIService(brandId);
    const batchId = await openAI.submitBatch(requests);

    const job = await this.jobRepo.create({
      brandId,
      openAiBatchId: batchId,
      openAiKeySnapshot: keySnapshot,
      prompt: systemPrompt,
      styleDirection: styleDirection ?? "",
      status: "processing",
      templateCount: quantity,
    });

    // Created sequentially (not Promise.all) so createdAt is strictly increasing —
    // CheckTemplateGenerationJob maps batch results back to these stubs positionally
    // via findByGenerationJobId's createdAt-asc order, which requires that ordering
    // to match the requests array order.
    for (let i = 0; i < requests.length; i++) {
      await this.templateRepo.create({
        brandId,
        name: "Generando…",
        html: "",
        variables: [],
        isAiGenerated: true,
        generationStatus: "generating",
        generationJobId: job.id,
      });
    }

    return job;
  }
}

// Multi-image collage archetypes are only realistic for brands with enough real
// content-asset photography to fill them post after post — cap how collage-heavy
// the generated library skews based on current asset supply, instead of forcing
// 2-3 image slots on a brand that has no photography to put in them.
function pickSlotCount(index: number, contentAssetCount: number): number {
  const maxSlot = contentAssetCount === 0 ? 1 : contentAssetCount <= 5 ? 2 : 3;
  return Math.min(index % 4, maxSlot);
}

// Aggregates the hex hints the style-reference vision analysis embeds in styleSummary,
// instead of falling back straight to black/white/gray when the brand hasn't manually
// curated colorPalette but HAS uploaded visual references. Done in code (not by asking
// the model to "infer" a palette per request) so every template in the same batch agrees
// on one palette instead of each of the N independent batch requests inventing its own.
function derivePaletteFromStyleSummaries(summaries: string[], limit = 5): string[] {
  const freq = new Map<string, number>();
  for (const summary of summaries) {
    const hexes = new Set((summary.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map(h => h.toLowerCase()));
    for (const hex of hexes) freq.set(hex, (freq.get(hex) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([hex]) => hex);
}

function buildUserPrompt(slotCount: number, suggestedArchetype: string): string {
  const assetLine = slotCount > 0
    ? `Este template debe incluir exactamente ${slotCount} placeholder(s) de imagen de contenido: ${Array.from({ length: slotCount }, (_, i) => `{{assetImageUrl${i + 1}}}`).join(", ")}.`
    : "Este template NO debe incluir ningún placeholder {{assetImageUrlN}} — es un diseño solo de texto/color (y logo, si corresponde).";
  return `Generá un template de Instagram nuevo con ${slotCount} placeholder(s) de imagen de contenido (cantidad fija, no la cambies).
Estilo de layout sugerido dentro de esa cantidad de slots (una idea de partida para variar la librería entre templates — NO es obligatorio): "${suggestedArchetype}".
Usalo solo si tiene sentido para las referencias de estilo de la marca (si las hay) y sus pilares de contenido/oferta. Si un layout distinto encaja mejor, elegilo vos y contá por qué en "archetypeRationale".
${assetLine}`;
}

function buildTemplateGenerationSystemPrompt(
  brand: { name: string; industry: string; voice: string; typography?: { primary?: string; secondary?: string; googleFontsUrl?: string } },
  colorPalette: string[],
  derivedPalette: string[],
  logoUrl: string,
  baseTemplate: { html: string; name: string } | null,
  performance: IgTemplatePerformanceSummary | null,
  styleDirection: string | undefined,
  styleReferenceSummaries: string[],
  companyContext: Record<string, string | undefined>,
): string {
  const typography = brand.typography ?? {};
  const typographySection = [
    `- Fuente principal: ${typography.primary || "sin especificar"}`,
    typography.secondary ? `- Fuente secundaria: ${typography.secondary}` : null,
    typography.googleFontsUrl ? `- Importar con: <link href="${typography.googleFontsUrl}" rel="stylesheet">` : null,
  ].filter(Boolean).join("\n");

  const htmlFontRule = typography.googleFontsUrl
    ? `- Incluí el <link> de Google Fonts en el <head> y usá las fuentes de la marca (${typography.primary}${typography.secondary ? `, ${typography.secondary}` : ""}) en los estilos CSS.`
    : `- No hay una URL de Google Fonts configurada, así que "${typography.primary || "la fuente principal"}" puede no estar disponible como fuente web y el navegador la reemplazaría en silencio por una genérica. NO la des por garantizada: usá directamente una fuente de sistema segura (ej. -apple-system, "Segoe UI", Helvetica, Arial, sans-serif) como font-family real, salvo que sea una fuente de sistema estándar.`;

  let iterationSection = "";
  if (baseTemplate) {
    iterationSection += `\nTEMPLATE BASE A ITERAR (partí de este diseño, mejorándolo — no generes algo completamente distinto):\n${baseTemplate.html}\n`;
    if (performance) {
      const total = performance.approvedCount + performance.rejectedCount;
      const rate = total > 0 ? Math.round((performance.approvedCount / total) * 100) : null;
      iterationSection += `\n📊 Rendimiento de este template: ${performance.approvedCount} aprobados, ${performance.rejectedCount} rechazados${rate !== null ? ` (tasa de aprobación: ${rate}%)` : ""}${performance.avgEngagement !== null ? `, engagement promedio: ${performance.avgEngagement}` : ""}.\n`;
      if (performance.mismatchReasons.length > 0) {
        iterationSection += `⚠️ Motivos de rechazo por mala adaptación del template al contenido:\n${performance.mismatchReasons.map(r => `- ${r}`).join("\n")}\nConsiderá si el layout/variables de este template son demasiado rígidos para estos casos.\n`;
      }
    }
  }

  let styleReferencesSection = "";
  if (styleReferenceSummaries.length > 0) {
    const lines = styleReferenceSummaries.map(s => `- ${s}`).join("\n");
    styleReferencesSection = `\n📌 Referencias de estilo visual subidas por la marca (a diferencia de un post puntual, ACÁ SÍ querés que tus templates se PAREZCAN concretamente a estas referencias — layout, paleta, tratamiento tipográfico — porque tu trabajo es literalmente diseñar el layout):\n${lines}\nDiseñá usando estos patrones como referencia principal de look-and-feel. Si el estilo de layout sugerido para este pedido puntual no coincide con el patrón dominante de estas referencias, priorizá igual mantener paleta/tipografía/tratamiento consistentes con ellas.\n`;
  }

  const companyLines = Object.entries(companyContext ?? {}).filter(([, value]) => value?.trim()).map(([key, value]) => `- ${key}: ${value}`).join("\n");
  const companyContextSection = companyLines ? `\n🏢 Contexto estable de la empresa:\n${companyLines}\n` : "";

  const coloresSection = colorPalette.length > 0
    ? `Usá EXCLUSIVAMENTE los colores de la paleta de marca (${JSON.stringify(colorPalette)}) para fondos, acentos y elementos gráficos. No inventes ni agregues colores adicionales fuera de esa lista (ni siquiera tonos "de apoyo" o degradados con otros colores).`
    : derivedPalette.length > 0
      ? `No hay paleta de marca configurada explícitamente, pero tus referencias de estilo visual sugieren esta paleta aproximada, inferida automáticamente: ${JSON.stringify(derivedPalette)}. Usala como punto de partida principal — mantené la MISMA familia de colores en todos los templates que generés para esta marca en esta tanda (no inventes una paleta distinta en cada uno). Podés ajustar tonos levemente, pero no te alejes de esta familia. No agregues colores adicionales fuera de ella salvo blanco/negro puro para contraste de texto.`
      : `No hay paleta de colores definida para esta marca. NO inventes una paleta corporativa elaborada (nada de degradados, múltiples acentos, colores "de marca" inventados). Usá un esquema minimalista en blanco/negro/grises, con como máximo el color del logo (si es claramente identificable) como único acento.`;

  return `Sos un experto en diseño gráfico para Instagram, diseñando un TEMPLATE reutilizable (no un post específico) para la marca "${brand.name}" (${brand.industry || "general"}).
Voz de la marca: ${brand.voice || "No especificada"}
Paleta de colores: ${JSON.stringify(colorPalette)}
Tipografía de la marca:
${typographySection}
${styleDirection?.trim() ? `\nDirección de estilo solicitada: ${styleDirection.trim()}\n` : ""}${iterationSection}${styleReferencesSection}${companyContextSection}
FORMATO:
- Documento HTML completo y autocontenido, lienzo cuadrado de 1080x1080px.
- Solo estilos inline o <style> dentro del propio documento; sin referencias a archivos externos salvo el <link> de Google Fonts si corresponde.
- Usá placeholders {{nombreDeVariable}} (nombres semánticos según tu propio diseño, ej. {{headline}}, {{subtext}}, {{cta}}) para todo el contenido de texto dinámico. NO incluyas texto real de un post específico — el template debe ser genérico y reutilizable para muchos posts futuros.
- Usá EXACTAMENTE la cantidad de placeholders {{assetImageUrlN}} que se te indique en cada pedido — nunca una URL fija.

Colores:
- ${coloresSection}

Tipografía:
${htmlFontRule}

${logoUrl ? `Logo:
- Hay un logo real de la marca disponible en {{brandLogoUrl}}. El template debe mostrarlo como imagen (<img src="{{brandLogoUrl}}">), NUNCA como solo el nombre de la marca en texto suelto.
- El archivo del logo puede tener mucho espacio vacío/transparente alrededor de la marca real: usá un contenedor aproximadamente CUADRADO (ej. ~72x72px a 96x96px en el lienzo de 1080px) con object-fit: contain (nunca lo estires ni lo distorsiones), para recortar visualmente ese espacio vacío.
- El logo debe verse prominente y legible, no como un ícono diminuto perdido en una esquina.
- NO le agregues una tarjeta, card ni fondo de color (blanco, oscuro, ni ningún otro) detrás del logo, ni padding con background visible alrededor de la imagen. La mayoría de los archivos de logo ya son íconos autocontenidos (con su propio color/fondo o transparencia) pensados para apoyarse directo sobre cualquier superficie — envolverlo en una caja adicional se ve como un recuadro redundante y rompe el diseño. Mostrá el <img> solo (sin div contenedor con background), apoyado directamente sobre el fondo del diseño.

` : ""}Contraste (aplica a TODO el diseño, no solo al logo):
- Cualquier texto o elemento gráfico debe tener contraste claro contra el fondo inmediato donde se apoya: texto claro SOLO sobre fondos oscuros, texto oscuro SOLO sobre fondos claros.
- Nunca combines colores de tono similar entre un elemento (texto, ícono, logo) y el fondo directamente detrás de él, aunque ambos sean colores válidos de la paleta — la paleta define QUÉ colores usar, no dónde combinarlos sin criterio.

Reglas numéricas de diseño (lienzo 1080x1080px):
- Margen de seguridad: ningún texto/elemento relevante a menos de 64px de cualquier borde.
- Escala de espaciado: SOLO múltiplos de 8px para paddings/márgenes/gaps (8, 16, 24, 32, 48, 64, 96) — nunca valores arbitrarios.
- Tamaños de fuente: headline 56-96px; subtítulo/cuerpo 28-40px; texto pequeño/CTA 24-32px. Nunca cuerpo por debajo de 28px (ilegible a tamaño de miniatura en el feed).
- Interlineado: 1.15-1.3 en titulares, 1.4-1.6 en cuerpo.
- Ancho máximo de un bloque de texto: 85% del ancho del lienzo.
- Jerarquía: un solo elemento como foco visual dominante (headline O imagen, no ambos compitiendo).

${TEMPLATE_GOLD_STANDARD_EXAMPLE}

Antes de devolver la respuesta, revisá tu propio HTML contra esta lista:
- ¿Usé solamente los colores permitidos (de la paleta, de la paleta inferida de las referencias, o el esquema minimalista si no hay ninguna)?
${logoUrl ? "- ¿El logo se ve grande y legible (no diminuto), como <img> real (no como texto), y SIN ninguna tarjeta/fondo de color agregado detrás?\n" : ""}- ¿La cantidad de placeholders {{assetImageUrlN}} coincide EXACTAMENTE con la pedida?
- ¿Cada bloque de texto tiene contraste suficiente contra lo que tiene detrás?
- ¿Usé una fuente que realmente va a cargar (system font, o Google Fonts con su <link>)?
- ¿Respeté los márgenes de seguridad y la escala de espaciado de 8px?
- ¿El diseño es genérico/reutilizable, sin contenido real de un post específico?
Corregí el HTML antes de responder si falla alguno de estos puntos.

Devolvé SOLO JSON válido, sin texto adicional ni markdown.

Schema de respuesta:
{
  "name": "string (nombre descriptivo corto del template)",
  "html": "string (el documento HTML completo)",
  "archetypeRationale": "string (1 línea: por qué elegiste este layout para este template)"
}`;
}
