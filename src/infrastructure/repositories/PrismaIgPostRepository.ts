import { prisma } from "../db/prisma";
import type { IgPostRepository, IgPostCreateData, IgPostUpdateData } from "../../domain/repositories/IgPostRepository";
import type { IgPost, IgPostStatus } from "../../domain/entities/IgPost";

function mapPost(raw: Record<string, unknown>): IgPost {
  return {
    id:               raw.id               as string,
    brandId:          raw.brandId          as string,
    templateId:       raw.templateId       as string | null,
    batchJobId:       raw.batchJobId       as string | null,
    caption:          raw.caption          as string,
    hashtags:         raw.hashtags         as string[],
    variables:        (raw.variables       as Record<string, string>) ?? {},
    status:           raw.status           as IgPostStatus,
    approvedById:     raw.approvedById     as string | null,
    approvedAt:       raw.approvedAt       as Date | null,
    rejectedAt:       raw.rejectedAt       as Date | null,
    rejectReason:     raw.rejectReason     as string,
    imageUrl:         raw.imageUrl         as string | null,
    instagramMediaId: raw.instagramMediaId as string | null,
    publishStatus:    (raw.publishStatus   as string) ?? "unpublished",
    publishedAt:      raw.publishedAt      as Date | null,
    igImpressions:    (raw.igImpressions   as number) ?? 0,
    igReach:          (raw.igReach         as number) ?? 0,
    igEngagement:     (raw.igEngagement    as number) ?? 0,
    igSaved:          (raw.igSaved         as number) ?? 0,
    igSyncedAt:       raw.igSyncedAt       as Date | null,
    inputTokens:      (raw.inputTokens     as number) ?? 0,
    outputTokens:     (raw.outputTokens    as number) ?? 0,
    estimatedCostUsd: (raw.estimatedCostUsd as number) ?? 0,
    createdAt:        raw.createdAt        as Date,
    updatedAt:        raw.updatedAt        as Date,
  };
}

export class PrismaIgPostRepository implements IgPostRepository {
  async create(data: IgPostCreateData): Promise<IgPost> {
    const raw = await prisma.igPost.create({
      data: {
        brandId:    data.brandId,
        batchJobId: data.batchJobId,
        caption:    data.caption    ?? "",
        hashtags:   data.hashtags   ?? [],
        variables:  data.variables  ?? {},
        status:     data.status     ?? "generating",
        templateId: data.templateId ?? null,
      },
    });
    return mapPost(raw as unknown as Record<string, unknown>);
  }

  async createMany(items: IgPostCreateData[]): Promise<number> {
    const result = await prisma.igPost.createMany({
      data: items.map(d => ({
        brandId:    d.brandId,
        batchJobId: d.batchJobId,
        caption:    d.caption    ?? "",
        hashtags:   d.hashtags   ?? [],
        variables:  d.variables  ?? {},
        status:     d.status     ?? "generating",
        templateId: d.templateId ?? null,
      })),
    });
    return result.count;
  }

  async findByBrandId(brandId: string, status?: IgPostStatus): Promise<IgPost[]> {
    const rows = await prisma.igPost.findMany({
      where: { brandId, ...(status && { status }) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(r => mapPost(r as unknown as Record<string, unknown>));
  }

  async findByBatchJobId(batchJobId: string): Promise<IgPost[]> {
    const rows = await prisma.igPost.findMany({
      where: { batchJobId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(r => mapPost(r as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<IgPost | null> {
    const raw = await prisma.igPost.findUnique({ where: { id } });
    return raw ? mapPost(raw as unknown as Record<string, unknown>) : null;
  }

  async update(id: string, data: IgPostUpdateData): Promise<IgPost> {
    const raw = await prisma.igPost.update({
      where: { id },
      data: {
        ...(data.caption          !== undefined && { caption: data.caption }),
        ...(data.hashtags         !== undefined && { hashtags: data.hashtags }),
        ...(data.variables        !== undefined && { variables: data.variables }),
        ...(data.status           !== undefined && { status: data.status }),
        ...(data.templateId       !== undefined && { templateId: data.templateId }),
        ...(data.approvedById     !== undefined && { approvedById: data.approvedById }),
        ...(data.approvedAt       !== undefined && { approvedAt: data.approvedAt }),
        ...(data.rejectedAt       !== undefined && { rejectedAt: data.rejectedAt }),
        ...(data.rejectReason     !== undefined && { rejectReason: data.rejectReason }),
        ...(data.imageUrl         !== undefined && { imageUrl: data.imageUrl }),
        ...(data.instagramMediaId !== undefined && { instagramMediaId: data.instagramMediaId }),
        ...(data.publishStatus    !== undefined && { publishStatus: data.publishStatus }),
        ...(data.publishedAt      !== undefined && { publishedAt: data.publishedAt }),
        ...(data.igImpressions    !== undefined && { igImpressions: data.igImpressions }),
        ...(data.igReach          !== undefined && { igReach: data.igReach }),
        ...(data.igEngagement     !== undefined && { igEngagement: data.igEngagement }),
        ...(data.igSaved          !== undefined && { igSaved: data.igSaved }),
        ...(data.igSyncedAt       !== undefined && { igSyncedAt: data.igSyncedAt }),
        ...(data.inputTokens      !== undefined && { inputTokens: data.inputTokens }),
        ...(data.outputTokens     !== undefined && { outputTokens: data.outputTokens }),
        ...(data.estimatedCostUsd !== undefined && { estimatedCostUsd: data.estimatedCostUsd }),
      },
    });
    return mapPost(raw as unknown as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    await prisma.igPost.delete({ where: { id } });
  }
}
