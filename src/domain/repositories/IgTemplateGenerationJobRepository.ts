import type { IgTemplateGenerationJob } from "../entities/IgTemplateGenerationJob";

export interface IgTemplateGenerationJobCreateData {
  brandId: string;
  openAiBatchId?: string | null;
  openAiKeySnapshot?: string | null;
  prompt: string;
  styleDirection?: string;
  status?: string;
  templateCount?: number;
}

export interface IgTemplateGenerationJobUpdateData {
  openAiBatchId?: string | null;
  openAiKeySnapshot?: string | null;
  status?: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export interface IgTemplateGenerationJobRepository {
  create(data: IgTemplateGenerationJobCreateData): Promise<IgTemplateGenerationJob>;
  findByBrandId(brandId: string): Promise<IgTemplateGenerationJob[]>;
  findByStatus(status: string): Promise<IgTemplateGenerationJob[]>;
  findById(id: string): Promise<IgTemplateGenerationJob | null>;
  update(id: string, data: IgTemplateGenerationJobUpdateData): Promise<IgTemplateGenerationJob>;
}
