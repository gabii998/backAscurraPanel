export type IgPostStatus = "generating" | "draft" | "approved" | "rejected";

// CheckBatchStatus.ts tags rejectReason with one of these prefixes when a post is auto-rejected
// due to an OpenAI API/technical failure, as opposed to a genuine reviewer rejection (RejectIgPost.ts
// never uses these prefixes). Consumers building LLM few-shot "qué evitar" context from rejected
// posts (GenerateIgPosts.ts, SynthesizeBrandLearning.ts) must exclude technical rejections.
export const TECHNICAL_REJECTION_PREFIX_GENERATION = "[error de generación]";
export const TECHNICAL_REJECTION_PREFIX_IMAGE = "[error de imagen]";
export const TECHNICAL_REJECTION_PREFIXES = [
  TECHNICAL_REJECTION_PREFIX_GENERATION,
  TECHNICAL_REJECTION_PREFIX_IMAGE,
] as const;

export interface IgPost {
  id: string;
  brandId: string;
  batchJobId: string | null;
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  status: IgPostStatus;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectReason: string;
  imageUrl: string | null;
  instagramMediaId: string | null;
  publishStatus: string;
  publishedAt: Date | null;
  igImpressions: number;
  igReach: number;
  igEngagement: number;
  igSaved: number;
  igSyncedAt: Date | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  createdAt: Date;
  updatedAt: Date;
}
