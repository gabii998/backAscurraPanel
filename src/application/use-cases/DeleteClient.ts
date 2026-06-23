import type { ClientRepository } from "../../domain/repositories/ClientRepository";

export class DeleteClient {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) throw new Error("CLIENT_NOT_FOUND");
  }
}
