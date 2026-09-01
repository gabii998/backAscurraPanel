export interface IgTemplate {
  id: string;
  brandId: string;
  name: string;
  html: string;
  variables: string[];
  summary: string;
  summaryStatus: string;
  summaryError: string;
  isAiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}
