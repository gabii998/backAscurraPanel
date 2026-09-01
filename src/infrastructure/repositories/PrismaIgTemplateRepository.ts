import { prisma } from "../db/prisma";
import type { IgTemplateRepository, IgTemplateCreateData, IgTemplateUpdateData, IgTemplatePerformanceSummary } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplate } from "../../domain/entities/IgTemplate";

function mapTemplate(raw: Record<string, unknown>): IgTemplate {
  return {
    id:               raw.id               as string,
    brandId:          raw.brandId          as string,
    name:             raw.name             as string,
    html:             raw.html             as string,
    variables:        raw.variables        as string[],
    summary:          raw.summary          as string,
    summaryStatus:    raw.summaryStatus    as string,
    summaryError:     raw.summaryError     as string,
    summaryBatchId:   (raw.summaryBatchId  as string | null) ?? null,
    openAiKeySnapshot: (raw.openAiKeySnapshot as string | null) ?? null,
    isAiGenerated:    raw.isAiGenerated    as boolean,
    generationStatus: raw.generationStatus as string,
    generationError:  raw.generationError  as string,
    generationJobId:  (raw.generationJobId as string | null) ?? null,
    createdAt:        raw.createdAt        as Date,
    updatedAt:        raw.updatedAt        as Date,
  };
}

export class PrismaIgTemplateRepository implements IgTemplateRepository {
  async create(data: IgTemplateCreateData): Promise<IgTemplate> {
    const raw = await prisma.igTemplate.create({
      data: {
        brandId:          data.brandId,
        name:             data.name,
        html:             data.html,
        variables:        data.variables,
        isAiGenerated:    data.isAiGenerated ?? false,
        ...(data.generationStatus !== undefined && { generationStatus: data.generationStatus }),
        ...(data.generationJobId  !== undefined && { generationJobId: data.generationJobId }),
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

  async findByGenerationJobId(jobId: string): Promise<IgTemplate[]> {
    const rows = await prisma.igTemplate.findMany({
      where: { generationJobId: jobId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(r => mapTemplate(r as unknown as Record<string, unknown>));
  }

  async update(id: string, data: IgTemplateUpdateData): Promise<IgTemplate> {
    const raw = await prisma.igTemplate.update({
      where: { id },
      data: {
        ...(data.name             !== undefined && { name: data.name }),
        ...(data.html             !== undefined && { html: data.html }),
        ...(data.variables        !== undefined && { variables: data.variables }),
        ...(data.summary          !== undefined && { summary: data.summary }),
        ...(data.summaryStatus    !== undefined && { summaryStatus: data.summaryStatus }),
        ...(data.summaryError     !== undefined && { summaryError: data.summaryError }),
        ...(data.summaryBatchId   !== undefined && { summaryBatchId: data.summaryBatchId }),
        ...(data.openAiKeySnapshot !== undefined && { openAiKeySnapshot: data.openAiKeySnapshot }),
        ...(data.generationStatus !== undefined && { generationStatus: data.generationStatus }),
        ...(data.generationError  !== undefined && { generationError: data.generationError }),
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

  async getPerformanceSummary(templateId: string): Promise<IgTemplatePerformanceSummary> {
    const posts = await prisma.igPost.findMany({
      where: { templateId, status: { in: ["approved", "rejected"] } },
      select: { status: true, rejectReason: true, igEngagement: true, igSyncedAt: true },
    });
    const approved = posts.filter(p => p.status === "approved");
    const rejected = posts.filter(p => p.status === "rejected");
    const engagementSamples = approved.filter(p => p.igSyncedAt).map(p => p.igEngagement);
    const avgEngagement = engagementSamples.length > 0
      ? engagementSamples.reduce((sum, v) => sum + v, 0) / engagementSamples.length
      : null;
    const mismatchReasons = rejected
      .map(p => p.rejectReason)
      .filter(reason => reason.startsWith("[template]"))
      .map(reason => reason.replace("[template]", "").trim())
      .filter(Boolean)
      .slice(0, 5);
    return {
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      avgEngagement,
      mismatchReasons,
    };
  }
}
