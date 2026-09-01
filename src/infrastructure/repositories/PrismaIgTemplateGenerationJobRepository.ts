import { prisma } from "../db/prisma";
import type { IgTemplateGenerationJobRepository, IgTemplateGenerationJobCreateData, IgTemplateGenerationJobUpdateData } from "../../domain/repositories/IgTemplateGenerationJobRepository";
import type { IgTemplateGenerationJob } from "../../domain/entities/IgTemplateGenerationJob";

function mapJob(raw: Record<string, unknown>): IgTemplateGenerationJob {
  return {
    id:                raw.id                as string,
    brandId:           raw.brandId           as string,
    openAiBatchId:     raw.openAiBatchId     as string | null,
    openAiKeySnapshot: (raw.openAiKeySnapshot as string | null) ?? null,
    prompt:            raw.prompt            as string,
    styleDirection:    raw.styleDirection    as string,
    status:            raw.status            as string,
    templateCount:     raw.templateCount     as number,
    errorMessage:      raw.errorMessage      as string,
    inputTokens:       (raw.inputTokens      as number) ?? 0,
    outputTokens:      (raw.outputTokens     as number) ?? 0,
    estimatedCostUsd:  (raw.estimatedCostUsd as number) ?? 0,
    createdAt:         raw.createdAt         as Date,
    updatedAt:         raw.updatedAt         as Date,
  };
}

export class PrismaIgTemplateGenerationJobRepository implements IgTemplateGenerationJobRepository {
  async create(data: IgTemplateGenerationJobCreateData): Promise<IgTemplateGenerationJob> {
    const raw = await prisma.igTemplateGenerationJob.create({
      data: {
        brandId:           data.brandId,
        openAiBatchId:     data.openAiBatchId ?? null,
        openAiKeySnapshot: data.openAiKeySnapshot ?? null,
        prompt:            data.prompt,
        styleDirection:    data.styleDirection ?? "",
        status:            data.status ?? "pending",
        templateCount:     data.templateCount ?? 0,
      },
    });
    return mapJob(raw as unknown as Record<string, unknown>);
  }

  async findByBrandId(brandId: string): Promise<IgTemplateGenerationJob[]> {
    const rows = await prisma.igTemplateGenerationJob.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(r => mapJob(r as unknown as Record<string, unknown>));
  }

  async findByStatus(status: string): Promise<IgTemplateGenerationJob[]> {
    const rows = await prisma.igTemplateGenerationJob.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(r => mapJob(r as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<IgTemplateGenerationJob | null> {
    const raw = await prisma.igTemplateGenerationJob.findUnique({ where: { id } });
    return raw ? mapJob(raw as unknown as Record<string, unknown>) : null;
  }

  async update(id: string, data: IgTemplateGenerationJobUpdateData): Promise<IgTemplateGenerationJob> {
    const raw = await prisma.igTemplateGenerationJob.update({
      where: { id },
      data: {
        ...(data.openAiBatchId     !== undefined && { openAiBatchId: data.openAiBatchId }),
        ...(data.openAiKeySnapshot !== undefined && { openAiKeySnapshot: data.openAiKeySnapshot }),
        ...(data.status            !== undefined && { status: data.status }),
        ...(data.errorMessage      !== undefined && { errorMessage: data.errorMessage }),
        ...(data.inputTokens       !== undefined && { inputTokens: data.inputTokens }),
        ...(data.outputTokens      !== undefined && { outputTokens: data.outputTokens }),
        ...(data.estimatedCostUsd  !== undefined && { estimatedCostUsd: data.estimatedCostUsd }),
      },
    });
    return mapJob(raw as unknown as Record<string, unknown>);
  }
}
