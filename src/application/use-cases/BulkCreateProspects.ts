import { randomUUID } from "crypto";
import type { Prospect } from "../../domain/entities/Prospect";
import type { ProspectRepository } from "../../domain/repositories/ProspectRepository";

type BulkProspectInput = Omit<Prospect, "id" | "createdAt" | "stage" | "notes" | "instagramUrl"> & {
  instagramUrl?: string;
};

export class BulkCreateProspects {
  constructor(private readonly repo: ProspectRepository) {}

  async execute(results: BulkProspectInput[]): Promise<number> {
    const prospects: Prospect[] = results.map(result => ({
      ...result,
      instagramUrl: result.instagramUrl || extractInstagramUrl(result.socialMedia),
      id:        randomUUID(),
      stage:     "new" as const,
      notes:     "",
      createdAt: new Date(),
    }));
    return this.repo.createBulk(prospects);
  }
}

function extractInstagramUrl(socialMedia: string): string {
  return socialMedia
    .split(',')
    .map(url => url.trim())
    .find(url => {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        return hostname === "instagram.com" || hostname.endsWith(".instagram.com");
      } catch {
        return false;
      }
    }) ?? "";
}
