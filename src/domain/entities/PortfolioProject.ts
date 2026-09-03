export interface PortfolioProject {
  id: string;
  tag: string;
  title: string;
  description: string;
  tech: string[];
  imageUrl: string;
  objectKey: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
