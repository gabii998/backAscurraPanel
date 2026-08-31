export interface IgBatchJob {
  id: string;
  brandId: string;
  openAiBatchId: string | null;
  prompt: string;
  status: string;
  postCount: number;
  errorMessage: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  contentAssetIds: string[];
  brandLogoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
