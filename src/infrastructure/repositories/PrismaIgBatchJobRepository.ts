import { prisma } from "../db/prisma";
import type { IgBatchJobRepository, IgBatchJobCreateData, IgBatchJobUpdateData } from "../../domain/repositories/IgBatchJobRepository";
import type { IgBatchJob } from "../../domain/entities/IgBatchJob";

function mapJob(raw: Record<string, unknown>): IgBatchJob {
  return {
    id:               raw.id               as string,
    brandId:          raw.brandId          as string,
    openAiBatchId:    raw.openAiBatchId    as string | null,
    openAiKeySnapshot: (raw.openAiKeySnapshot as string | null) ?? null,
    prompt:           raw.prompt           as string,
    status:           raw.status           as string,
    postCount:        raw.postCount        as number,
    errorMessage:     raw.errorMessage     as string,
    inputTokens:      (raw.inputTokens     as number) ?? 0,
    outputTokens:     (raw.outputTokens    as number) ?? 0,
    estimatedCostUsd: (raw.estimatedCostUsd as number) ?? 0,
    contentAssetIds: Array.isArray(raw.contentAssetIds) ? raw.contentAssetIds as string[] : [],
    brandLogoUrl: (raw.brandLogoUrl as string) ?? "",
    createdAt:        raw.createdAt        as Date,
    updatedAt:        raw.updatedAt        as Date,
  };
}

export class PrismaIgBatchJobRepository implements IgBatchJobRepository {
  async create(data: IgBatchJobCreateData): Promise<IgBatchJob> {
    const raw = await prisma.igBatchJob.create({
      data: {
        brandId:       data.brandId,
        openAiBatchId: data.openAiBatchId ?? null,
        openAiKeySnapshot: data.openAiKeySnapshot ?? null,
        prompt:        data.prompt,
        status:        data.status        ?? "pending",
        postCount:     data.postCount     ?? 0,
        contentAssetIds: data.contentAssetIds ?? [],
        brandLogoUrl: data.brandLogoUrl ?? "",
      },
    });
    return mapJob(raw as unknown as Record<string, unknown>);
  }

  async findByBrandId(brandId: string): Promise<IgBatchJob[]> {
    const rows = await prisma.igBatchJob.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(r => mapJob(r as unknown as Record<string, unknown>));
  }

  async findByStatus(status: string): Promise<IgBatchJob[]> {
    const rows = await prisma.igBatchJob.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(r => mapJob(r as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<IgBatchJob | null> {
    const raw = await prisma.igBatchJob.findUnique({ where: { id } });
    return raw ? mapJob(raw as unknown as Record<string, unknown>) : null;
  }

  async update(id: string, data: IgBatchJobUpdateData): Promise<IgBatchJob> {
    const raw = await prisma.igBatchJob.update({
      where: { id },
      data: {
        ...(data.openAiBatchId    !== undefined && { openAiBatchId: data.openAiBatchId }),
        ...(data.openAiKeySnapshot !== undefined && { openAiKeySnapshot: data.openAiKeySnapshot }),
        ...(data.status           !== undefined && { status: data.status }),
        ...(data.errorMessage     !== undefined && { errorMessage: data.errorMessage }),
        ...(data.inputTokens      !== undefined && { inputTokens: data.inputTokens }),
        ...(data.outputTokens     !== undefined && { outputTokens: data.outputTokens }),
        ...(data.estimatedCostUsd !== undefined && { estimatedCostUsd: data.estimatedCostUsd }),
      },
    });
    return mapJob(raw as unknown as Record<string, unknown>);
  }
}
