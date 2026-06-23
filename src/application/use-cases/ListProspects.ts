import type { Prospect } from "../../domain/entities/Prospect";
import type { ProspectRepository } from "../../domain/repositories/ProspectRepository";

export class ListProspects {
  constructor(private readonly repo: ProspectRepository) {}

  async execute(filter?: { stage?: string }): Promise<Prospect[]> {
    return this.repo.list(filter);
  }
}
