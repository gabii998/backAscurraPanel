import type { Prospect } from "../../domain/entities/Prospect";
import type { ProspectRepository } from "../../domain/repositories/ProspectRepository";

export class UpdateProspect {
  constructor(private readonly repo: ProspectRepository) {}

  async execute(id: string, data: Partial<Prospect>): Promise<Prospect> {
    return this.repo.update(id, data);
  }
}
