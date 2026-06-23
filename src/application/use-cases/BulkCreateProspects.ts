import { randomUUID } from "crypto";
import type { Prospect } from "../../domain/entities/Prospect";
import type { ProspectRepository } from "../../domain/repositories/ProspectRepository";

export class BulkCreateProspects {
  constructor(private readonly repo: ProspectRepository) {}

  async execute(results: Omit<Prospect, "id" | "createdAt" | "stage" | "notes">[]): Promise<number> {
    const prospects: Prospect[] = results.map(r => ({
      ...r,
      id:        randomUUID(),
      stage:     "new" as const,
      notes:     "",
      createdAt: new Date(),
    }));
    return this.repo.createBulk(prospects);
  }
}
