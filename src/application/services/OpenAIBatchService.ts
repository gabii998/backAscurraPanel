export interface BatchRequest {
  customId: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface BatchResult {
  customId: string;
  content: string;
  error?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface OpenAIBatchService {
  submitBatch(requests: BatchRequest[]): Promise<string>;
  getBatchStatus(batchId: string): Promise<{ status: string; outputFileId?: string }>;
  downloadBatchResults(outputFileId: string): Promise<BatchResult[]>;
}
