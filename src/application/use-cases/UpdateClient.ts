import type { ClientRepository } from "../../domain/repositories/ClientRepository";
import type { ClientUpdateData } from "../../domain/model/ClientCreateData";
import type { Client } from "../../domain/entities/Client";

export class UpdateClient {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, data: ClientUpdateData): Promise<Client> {
    const updated = await this.repository.update(id, data);
    if (!updated) throw new Error("CLIENT_NOT_FOUND");
    return updated;
  }
}
