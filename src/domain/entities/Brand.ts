export interface BrandTypography {
  primary?: string;
  secondary?: string;
  googleFontsUrl?: string;
}

export interface CompanyContext {
  offer?: string; audience?: string; market?: string; valueProposition?: string;
  differentiators?: string; objectives?: string; contentPillars?: string;
  restrictions?: string; allowedCtas?: string;
}

export interface Brand {
  id: string;
  name: string;
  industry: string;
  acknowledge: string;
  voice: string;
  colorPalette: string[];
  typography: BrandTypography;
  logoUrl: string;
  igUserId: string;
  openAiModel: string;
  companyContext: CompanyContext;
  hasOpenAiApiKey: boolean;
  createdAt: Date;
  updatedAt: Date;
}
