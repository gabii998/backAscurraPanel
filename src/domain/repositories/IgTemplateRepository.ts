import type { IgTemplate } from "../entities/IgTemplate";

export interface IgTemplateCreateData {
  brandId: string;
  name: string;
  html: string;
  variables: string[];
  isAiGenerated?: boolean;
  generationStatus?: string;
  generationJobId?: string;
}

export interface IgTemplateUpdateData {
  name?: string;
  html?: string;
  variables?: string[];
  summary?: string;
  summaryStatus?: string;
  summaryError?: string;
  summaryBatchId?: string | null;
  openAiKeySnapshot?: string | null;
  generationStatus?: string;
  generationError?: string;
}

export interface IgTemplatePerformanceSummary {
  approvedCount: number;
  rejectedCount: number;
  avgEngagement: number | null;
  mismatchReasons: string[];
}

export interface IgTemplateRepository {
  create(data: IgTemplateCreateData): Promise<IgTemplate>;
  findByBrandId(brandId: string): Promise<IgTemplate[]>;
  findById(id: string): Promise<IgTemplate | null>;
  findByGenerationJobId(jobId: string): Promise<IgTemplate[]>;
  update(id: string, data: IgTemplateUpdateData): Promise<IgTemplate>;
  delete(id: string): Promise<void>;
  findPendingSummary(): Promise<IgTemplate[]>;
  getPerformanceSummary(templateId: string): Promise<IgTemplatePerformanceSummary>;
}
