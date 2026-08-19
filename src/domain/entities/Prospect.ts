export type ProspectStage = 'new' | 'contacted' | 'interested' | 'discarded';

export interface Prospect {
  id: string;
  name: string;
  industry: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  hours: string;
  socialMedia: string;
  instagramUrl: string;
  hasWebsite: boolean;
  hasSocialMedia: boolean;
  rating: number;
  reviewCount: number;
  score: number;
  scoreLabel: string;
  stage: ProspectStage;
  notes: string;
  googleId: string | null;
  createdAt: Date;
}
