import type { IgTemplate } from "../entities/IgTemplate";

export interface IgTemplateCreateData {
  brandId: string;
  name: string;
  html: string;
  variables: string[];
  isAiGenerated?: boolean;
}

export interface IgTemplateUpdateData {
  name?: string;
  html?: string;
  variables?: string[];
  summary?: string;
  summaryStatus?: string;
}

export interface IgTemplateRepository {
  create(data: IgTemplateCreateData): Promise<IgTemplate>;
  findByBrandId(brandId: string): Promise<IgTemplate[]>;
  findById(id: string): Promise<IgTemplate | null>;
  update(id: string, data: IgTemplateUpdateData): Promise<IgTemplate>;
  delete(id: string): Promise<void>;
  findPendingSummary(): Promise<IgTemplate[]>;
}
