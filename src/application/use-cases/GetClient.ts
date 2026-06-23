import type { ClientRepository } from "../../domain/repositories/ClientRepository";
import type { Client } from "../../domain/entities/Client";

export class GetClient {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string): Promise<Client> {
    const client = await this.repository.findById(id);
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    return client;
  }
}
