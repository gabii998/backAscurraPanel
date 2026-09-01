export interface BatchRequest {
  customId: string;
  systemPrompt: string;
  userPrompt: string;
  imageUrl?: string;
  responseFormat?: "json" | "text";
}

export interface BatchResult {
  customId: string;
  content: string;
  error?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface OpenAIBatchService {
  submitBatch(requests: BatchRequest[]): Promise<string>;
  getBatchStatus(batchId: string, options?: { autoRetryOnFileError?: boolean }): Promise<{ status: string; outputFileId?: string; errorFileId?: string; errorDetail?: string; retriedBatchId?: string }>;
  downloadBatchResults(outputFileId: string): Promise<BatchResult[]>;
}
