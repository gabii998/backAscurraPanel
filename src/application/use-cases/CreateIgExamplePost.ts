import { randomUUID } from "crypto";
import type { IgExamplePost } from "../../domain/entities/IgExamplePost";
import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { R2Storage } from "../../infrastructure/services/R2Storage";
import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

export interface CreateIgExamplePostInput {
  brandId: string;
  assetType: "style_reference" | "product" | "system_screenshot" | "brand_asset";
  title?: string;
  description?: string;
  notes?: string;
  isPrimaryLogo?: boolean;
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
}

export class CreateIgExamplePost {
  constructor(private brandRepo: BrandRepository, private storage: R2Storage) {}

  async execute(input: CreateIgExamplePostInput): Promise<IgExamplePost> {
    if (!input.file) throw new Error("MISSING_FIELDS");
    if (["product", "system_screenshot"].includes(input.assetType) && (!input.title || !input.description)) throw new Error("MISSING_FIELDS");
    if (input.isPrimaryLogo && input.assetType !== "brand_asset") throw new Error("INVALID_PRIMARY_LOGO");
    if (!ALLOWED_TYPES.has(input.file.mimetype)) throw new Error("INVALID_IMAGE_TYPE");
    const brand = await this.brandRepo.findById(input.brandId);
    if (!brand) throw new Error("BRAND_NOT_FOUND");
    if (input.isPrimaryLogo) await prisma.igExamplePost.updateMany({ where: { brandId: input.brandId }, data: { isPrimaryLogo: false } });
    const example = await prisma.igExamplePost.create({ data: { brandId: input.brandId, assetType: input.assetType, title: input.title ?? "", description: input.description ?? "", notes: input.notes ?? "", isPrimaryLogo: !!input.isPrimaryLogo } });
    const objectKey = `instagram/${input.brandId}/references/${example.id}/${randomUUID()}.${EXTENSIONS[input.file.mimetype]}`;
    let imageUrl: string;
    try {
      imageUrl = await this.storage.put(objectKey, input.file.buffer, input.file.mimetype);
    } catch (error) {
      await prisma.igExamplePost.delete({ where: { id: example.id } });
      throw error;
    }
    try {
      if (input.isPrimaryLogo) await prisma.brand.update({ where: { id: input.brandId }, data: { logoUrl: imageUrl } });
    } catch (error) {
      await this.storage.delete(objectKey).catch(() => {});
      await prisma.igExamplePost.delete({ where: { id: example.id } });
      throw error;
    }
    const uploaded = await prisma.igExamplePost.update({ where: { id: example.id }, data: {
      imageUrl, objectKey, fileName: input.file.originalname, mimeType: input.file.mimetype, fileSize: input.file.size,
      summaryStatus: input.assetType === "style_reference" ? "processing" : "done",
    } });
    if (input.assetType !== "style_reference") return uploaded;
    try {
      const batchId = await (await resolveOpenAIService(input.brandId)).submitBatch([{
        customId: `example-summary-${example.id}`,
        systemPrompt: "Analizá esta referencia de Instagram. Respondé SOLO JSON válido con summary. Describí ÚNICAMENTE patrones abstractos: composición, paleta, jerarquía, tono, longitud, emojis, puntuación y estructura. No transcribas ni menciones texto visible, temas, marcas, productos, ofertas, hashtags, frases ni CTAs.",
        userPrompt: "Generá una ficha abstracta de estilo, sin conservar contenido de la publicación.",
        imageUrl,
        responseFormat: "json",
      }]);
      return prisma.igExamplePost.update({ where: { id: example.id }, data: {
        summaryBatchId: batchId, summaryStatus: "processing",
      } });
    } catch (error) {
      return prisma.igExamplePost.update({ where: { id: example.id }, data: { summaryStatus: "failed", summaryError: "STYLE_ANALYSIS_UNAVAILABLE" } });
    }
  }
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
