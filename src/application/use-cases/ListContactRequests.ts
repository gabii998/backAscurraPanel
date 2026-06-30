import type { ContactRequest } from "../../domain/entities/ContactRequest";
import type { ContactRequestRepository } from "../../domain/repositories/ContactRequestRepository";

export class ListContactRequests {
  constructor(private readonly repo: ContactRequestRepository) {}

  async execute(): Promise<ContactRequest[]> {
    return this.repo.list();
  }
}
