import { prisma } from "../db/prisma";
import type { BrandRepository, BrandCreateData, BrandUpdateData } from "../../domain/repositories/BrandRepository";
import type { Brand } from "../../domain/entities/Brand";
import { EncryptionService } from "../services/EncryptionService";
import { env } from "../../config/env";

const encryption = new EncryptionService(env.arcaEncryptionKey);

function mapBrand(raw: Record<string, unknown>): Brand {
  return {
    id:              raw.id           as string,
    name:            raw.name         as string,
    industry:        raw.industry     as string,
    acknowledge:     raw.acknowledge  as string,
    voice:           raw.voice        as string,
    colorPalette:    Array.isArray(raw.colorPalette) ? (raw.colorPalette as string[]) : [],
    logoUrl:         raw.logoUrl      as string,
    igUserId:        (raw.igUserId    as string) ?? "",
    openAiModel:     (raw.openAiModel as string) ?? "",
    hasOpenAiApiKey: !!(raw.openAiApiKey as string),
    createdAt:       raw.createdAt    as Date,
    updatedAt:       raw.updatedAt    as Date,
  };
}

export class PrismaBrandRepository implements BrandRepository {
  async create(data: BrandCreateData): Promise<Brand> {
    const raw = await prisma.brand.create({
      data: {
        name:         data.name,
        industry:     data.industry     ?? "",
        acknowledge:  data.acknowledge  ?? "",
        voice:        data.voice        ?? "",
        colorPalette: data.colorPalette ?? [],
        logoUrl:      data.logoUrl      ?? "",
      },
    });
    return mapBrand(raw as unknown as Record<string, unknown>);
  }

  async findAll(): Promise<Brand[]> {
    const rows = await prisma.brand.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(r => mapBrand(r as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<Brand | null> {
    const raw = await prisma.brand.findUnique({ where: { id } });
    return raw ? mapBrand(raw as unknown as Record<string, unknown>) : null;
  }

  async update(id: string, data: BrandUpdateData): Promise<Brand> {
    const raw = await prisma.brand.update({
      where: { id },
      data: {
        ...(data.name         !== undefined && { name: data.name }),
        ...(data.industry     !== undefined && { industry: data.industry }),
        ...(data.acknowledge  !== undefined && { acknowledge: data.acknowledge }),
        ...(data.voice        !== undefined && { voice: data.voice }),
        ...(data.colorPalette !== undefined && { colorPalette: data.colorPalette }),
        ...(data.logoUrl      !== undefined && { logoUrl: data.logoUrl }),
        ...(data.igUserId      !== undefined && { igUserId: data.igUserId }),
        ...(data.igAccessToken !== undefined && { igAccessToken: data.igAccessToken }),
        ...(data.openAiApiKey  !== undefined && { openAiApiKey: data.openAiApiKey ? encryption.encrypt(data.openAiApiKey) : "" }),
        ...(data.openAiModel   !== undefined && { openAiModel: data.openAiModel }),
      },
    });
    return mapBrand(raw as unknown as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    await prisma.brand.delete({ where: { id } });
  }
}
