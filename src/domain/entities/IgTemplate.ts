export interface IgTemplate {
  id: string;
  brandId: string;
  name: string;
  html: string;
  variables: string[];
  summary: string;
  summaryStatus: string;
  summaryError: string;
  summaryBatchId: string | null;
  openAiKeySnapshot: string | null;
  isAiGenerated: boolean;
  generationStatus: string;
  generationError: string;
  generationJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
