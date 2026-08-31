export interface IgExamplePost {
  id: string;
  brandId: string;
  imageUrl: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  caption: string;
  assetType: string;
  title: string;
  description: string;
  notes: string;
  isPrimaryLogo: boolean;
  styleSummary: string;
  summaryStatus: string;
  summaryBatchId: string | null;
  summaryError: string;
  createdAt: Date;
  updatedAt: Date;
}
