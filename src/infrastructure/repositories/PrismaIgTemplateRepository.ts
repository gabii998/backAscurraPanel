import { prisma } from "../db/prisma";
import type { IgTemplateRepository, IgTemplateCreateData, IgTemplateUpdateData } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplate } from "../../domain/entities/IgTemplate";

function mapTemplate(raw: Record<string, unknown>): IgTemplate {
  return {
    id:            raw.id            as string,
    brandId:       raw.brandId       as string,
    name:          raw.name          as string,
    html:          raw.html          as string,
    variables:     raw.variables     as string[],
    summary:       raw.summary       as string,
    summaryStatus: raw.summaryStatus as string,
    summaryError:  raw.summaryError  as string,
    isAiGenerated: raw.isAiGenerated as boolean,
    createdAt:     raw.createdAt     as Date,
    updatedAt:     raw.updatedAt     as Date,
  };
}

export class PrismaIgTemplateRepository implements IgTemplateRepository {
  async create(data: IgTemplateCreateData): Promise<IgTemplate> {
    const raw = await prisma.igTemplate.create({
      data: {
        brandId:       data.brandId,
        name:          data.name,
        html:          data.html,
        variables:     data.variables,
        isAiGenerated: data.isAiGenerated ?? false,
      },
    });
    return mapTemplate(raw as unknown as Record<string, unknown>);
  }

  async findByBrandId(brandId: string): Promise<IgTemplate[]> {
    const rows = await prisma.igTemplate.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(r => mapTemplate(r as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<IgTemplate | null> {
    const raw = await prisma.igTemplate.findUnique({ where: { id } });
    return raw ? mapTemplate(raw as unknown as Record<string, unknown>) : null;
  }

  async update(id: string, data: IgTemplateUpdateData): Promise<IgTemplate> {
    const raw = await prisma.igTemplate.update({
      where: { id },
      data: {
        ...(data.name          !== undefined && { name: data.name }),
        ...(data.html          !== undefined && { html: data.html }),
        ...(data.variables     !== undefined && { variables: data.variables }),
        ...(data.summary       !== undefined && { summary: data.summary }),
        ...(data.summaryStatus !== undefined && { summaryStatus: data.summaryStatus }),
        ...(data.summaryError  !== undefined && { summaryError: data.summaryError }),
      },
    });
    return mapTemplate(raw as unknown as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    await prisma.igTemplate.delete({ where: { id } });
  }

  async findPendingSummary(): Promise<IgTemplate[]> {
    const rows = await prisma.igTemplate.findMany({
      where: { summaryStatus: "pending" },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(r => mapTemplate(r as unknown as Record<string, unknown>));
  }
}
