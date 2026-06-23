import { randomUUID } from "crypto";
import type { Prospect } from "../../domain/entities/Prospect";
import type { ProspectRepository } from "../../domain/repositories/ProspectRepository";

export class CreateProspect {
  constructor(private readonly repo: ProspectRepository) {}

  async execute(data: Omit<Prospect, "id" | "createdAt">): Promise<Prospect> {
    return this.repo.create({ ...data, id: randomUUID(), createdAt: new Date() });
  }
}
