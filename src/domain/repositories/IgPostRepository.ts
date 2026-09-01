import type { IgPost, IgPostStatus } from "../entities/IgPost";

export interface IgPostCreateData {
  brandId: string;
  batchJobId: string;
  caption?: string;
  hashtags?: string[];
  variables?: Record<string, string>;
  status?: IgPostStatus;
  templateId?: string | null;
}

export interface IgPostUpdateData {
  caption?: string;
  hashtags?: string[];
  variables?: Record<string, string>;
  status?: IgPostStatus;
  templateId?: string | null;
  approvedById?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectReason?: string;
  imageUrl?: string | null;
  instagramMediaId?: string | null;
  publishStatus?: string;
  publishedAt?: Date | null;
  igImpressions?: number;
  igReach?: number;
  igEngagement?: number;
  igSaved?: number;
  igSyncedAt?: Date | null;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export interface IgPostRepository {
  create(data: IgPostCreateData): Promise<IgPost>;
  createMany(items: IgPostCreateData[]): Promise<number>;
  findByBrandId(brandId: string, status?: IgPostStatus): Promise<IgPost[]>;
  findByBatchJobId(batchJobId: string): Promise<IgPost[]>;
  findById(id: string): Promise<IgPost | null>;
  update(id: string, data: IgPostUpdateData): Promise<IgPost>;
  delete(id: string): Promise<void>;
}
