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

export interface ImageBatchRequest {
  customId: string;
  prompt: string;
}

export interface ImageBatchResult {
  customId: string;
  b64Json?: string;
  error?: string;
}

export interface OpenAIBatchService {
  submitBatch(requests: BatchRequest[]): Promise<string>;
  getBatchStatus(batchId: string, options?: { autoRetryOnFileError?: boolean }): Promise<{ status: string; outputFileId?: string; errorFileId?: string; errorDetail?: string; retriedBatchId?: string }>;
  downloadBatchResults(outputFileId: string): Promise<BatchResult[]>;
  // referenceImageUrls (logo/content assets), when non-empty, are attached to every request in
  // the batch and routed through /v1/images/edits instead of /v1/images/generations — a single
  // OpenAI batch can only target one endpoint, so callers must not mix requests that do and
  // don't need references within the same submitImageBatch call.
  submitImageBatch(requests: ImageBatchRequest[], referenceImageUrls?: string[]): Promise<string>;
  downloadImageBatchResults(outputFileId: string): Promise<ImageBatchResult[]>;
}
