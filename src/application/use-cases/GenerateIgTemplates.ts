import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { IgTemplateRepository, IgTemplatePerformanceSummary } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplateGenerationJobRepository } from "../../domain/repositories/IgTemplateGenerationJobRepository";
import type { IgTemplateGenerationJob } from "../../domain/entities/IgTemplateGenerationJob";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

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

    const systemPrompt = buildTemplateGenerationSystemPrompt(
      brand,
      colorPalette,
      logoUrl,
      baseTemplate,
      performance,
      styleDirection,
    );

    const requests = Array.from({ length: quantity }, (_, i) => {
      const slotCount = i % 4;
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

function buildUserPrompt(slotCount: number, archetype: string): string {
  const assetLine = slotCount > 0
    ? `Este template debe incluir exactamente ${slotCount} placeholder(s) de imagen de contenido: ${Array.from({ length: slotCount }, (_, i) => `{{assetImageUrl${i + 1}}}`).join(", ")}.`
    : "Este template NO debe incluir ningún placeholder {{assetImageUrlN}} — es un diseño solo de texto/color (y logo, si corresponde).";
  return `Generá un template de Instagram nuevo. Estilo de layout: ${archetype}. ${assetLine}`;
}

function buildTemplateGenerationSystemPrompt(
  brand: { name: string; industry: string; voice: string; typography?: { primary?: string; secondary?: string; googleFontsUrl?: string } },
  colorPalette: string[],
  logoUrl: string,
  baseTemplate: { html: string; name: string } | null,
  performance: IgTemplatePerformanceSummary | null,
  styleDirection: string | undefined,
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

  return `Sos un experto en diseño gráfico para Instagram, diseñando un TEMPLATE reutilizable (no un post específico) para la marca "${brand.name}" (${brand.industry || "general"}).
Voz de la marca: ${brand.voice || "No especificada"}
Paleta de colores: ${JSON.stringify(colorPalette)}
Tipografía de la marca:
${typographySection}
${styleDirection?.trim() ? `\nDirección de estilo solicitada: ${styleDirection.trim()}\n` : ""}${iterationSection}
FORMATO:
- Documento HTML completo y autocontenido, lienzo cuadrado de 1080x1080px.
- Solo estilos inline o <style> dentro del propio documento; sin referencias a archivos externos salvo el <link> de Google Fonts si corresponde.
- Usá placeholders {{nombreDeVariable}} (nombres semánticos según tu propio diseño, ej. {{headline}}, {{subtext}}, {{cta}}) para todo el contenido de texto dinámico. NO incluyas texto real de un post específico — el template debe ser genérico y reutilizable para muchos posts futuros.
- Usá EXACTAMENTE la cantidad de placeholders {{assetImageUrlN}} que se te indique en cada pedido — nunca una URL fija.

Colores:
- ${colorPalette.length > 0 ? `Usá EXCLUSIVAMENTE los colores de la paleta de marca (${JSON.stringify(colorPalette)}) para fondos, acentos y elementos gráficos. No inventes ni agregues colores adicionales fuera de esa lista (ni siquiera tonos "de apoyo" o degradados con otros colores).` : `No hay paleta de colores definida para esta marca. NO inventes una paleta corporativa elaborada (nada de degradados, múltiples acentos, colores "de marca" inventados). Usá un esquema minimalista en blanco/negro/grises, con como máximo el color del logo (si es claramente identificable) como único acento.`}

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

Antes de devolver la respuesta, revisá tu propio HTML contra esta lista:
- ¿Usé solamente los colores permitidos (de la paleta, o el esquema minimalista si no hay paleta)?
${logoUrl ? "- ¿El logo se ve grande y legible (no diminuto), como <img> real (no como texto), y SIN ninguna tarjeta/fondo de color agregado detrás?\n" : ""}- ¿La cantidad de placeholders {{assetImageUrlN}} coincide EXACTAMENTE con la pedida?
- ¿Cada bloque de texto tiene contraste suficiente contra lo que tiene detrás?
- ¿Usé una fuente que realmente va a cargar (system font, o Google Fonts con su <link>)?
- ¿El diseño es genérico/reutilizable, sin contenido real de un post específico?
Corregí el HTML antes de responder si falla alguno de estos puntos.

Devolvé SOLO JSON válido, sin texto adicional ni markdown.

Schema de respuesta:
{
  "name": "string (nombre descriptivo corto del template)",
  "html": "string (el documento HTML completo)"
}`;
}
