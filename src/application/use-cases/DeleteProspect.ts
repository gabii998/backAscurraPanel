import type { ProspectRepository } from "../../domain/repositories/ProspectRepository";

export class DeleteProspect {
  constructor(private readonly repo: ProspectRepository) {}

  async execute(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
