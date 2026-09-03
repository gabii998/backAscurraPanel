export interface PortfolioProjectCreateData {
  tag: string;
  title: string;
  description: string;
  tech: string[];
}

export interface PortfolioProjectUpdateData {
  tag?: string;
  title?: string;
  description?: string;
  tech?: string[];
}
