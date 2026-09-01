export interface IgTemplateGenerationJob {
  id: string;
  brandId: string;
  openAiBatchId: string | null;
  openAiKeySnapshot: string | null;
  prompt: string;
  styleDirection: string;
  status: string;
  templateCount: number;
  errorMessage: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  createdAt: Date;
  updatedAt: Date;
}
