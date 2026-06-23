import type { ClientRepository, ListClientsFilter } from "../../domain/repositories/ClientRepository";
import type { Client } from "../../domain/entities/Client";

export class ListClients {
  constructor(private readonly repository: ClientRepository) {}

  async execute(filter: ListClientsFilter): Promise<Client[]> {
    return this.repository.list(filter);
  }
}
