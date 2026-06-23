import type { Client, ClientStatus } from "../entities/Client";

export interface ListClientsFilter {
  status?: ClientStatus;
  query?: string;
}

export interface ClientRepository {
  findById(id: string): Promise<Client | null>;
  list(filter: ListClientsFilter): Promise<Client[]>;
  create(client: Client): Promise<Client>;
  update(id: string, data: Partial<Omit<Client, "id" | "createdAt" | "deletedAt" | "projectIds">>): Promise<Client | null>;
  softDelete(id: string): Promise<boolean>;
}
