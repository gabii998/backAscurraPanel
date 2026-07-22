export interface Brand {
  id: string;
  name: string;
  industry: string;
  acknowledge: string;
  voice: string;
  colorPalette: string[];
  logoUrl: string;
  igUserId: string;
  openAiModel: string;
  hasOpenAiApiKey: boolean;
  createdAt: Date;
  updatedAt: Date;
}
