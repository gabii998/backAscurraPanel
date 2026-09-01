import type { IgBatchJob } from "../entities/IgBatchJob";

export interface IgBatchJobCreateData {
  brandId: string;
  openAiBatchId?: string | null;
  openAiKeySnapshot?: string | null;
  prompt: string;
  status?: string;
  postCount?: number;
  contentAssetIds?: string[];
  brandLogoUrl?: string;
}

export interface IgBatchJobUpdateData {
  openAiBatchId?: string | null;
  openAiKeySnapshot?: string | null;
  status?: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export interface IgBatchJobRepository {
  create(data: IgBatchJobCreateData): Promise<IgBatchJob>;
  findByBrandId(brandId: string): Promise<IgBatchJob[]>;
  findByStatus(status: string): Promise<IgBatchJob[]>;
  findById(id: string): Promise<IgBatchJob | null>;
  update(id: string, data: IgBatchJobUpdateData): Promise<IgBatchJob>;
}
