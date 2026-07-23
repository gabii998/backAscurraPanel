export interface BrandTypography {
  primary?: string;
  secondary?: string;
  googleFontsUrl?: string;
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
  hasOpenAiApiKey: boolean;
  createdAt: Date;
  updatedAt: Date;
}
