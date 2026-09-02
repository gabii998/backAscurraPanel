export type IgPostStatus = "generating" | "draft" | "approved" | "rejected";

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
