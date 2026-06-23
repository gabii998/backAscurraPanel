import { randomUUID } from "crypto";
import type { ClientRepository } from "../../domain/repositories/ClientRepository";
import type { ClientCreateData } from "../../domain/model/ClientCreateData";
import type { Client } from "../../domain/entities/Client";

export class CreateClient {
  constructor(private readonly repository: ClientRepository) {}

  async execute(data: ClientCreateData): Promise<Client> {
    const client: Client = {
      id: randomUUID(),
      company: data.company,
      industry: data.industry,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      status: data.status ?? "prospect",
      contractSince: data.contractSince ?? null,
      lastActivity: new Date(),
      initials: data.initials,
      color: data.color,
      createdAt: new Date(),
      deletedAt: null,
      projectIds: [],
    };
    return this.repository.create(client);
  }
}
