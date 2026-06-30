import type { ContactRequest, ContactRequestStatus } from "../../domain/entities/ContactRequest";
import type { ContactRequestRepository } from "../../domain/repositories/ContactRequestRepository";

const VALID: ContactRequestStatus[] = ["new", "read", "archived"];

export class UpdateContactRequestStatus {
  constructor(private readonly repo: ContactRequestRepository) {}

  async execute(id: string, status: ContactRequestStatus): Promise<ContactRequest> {
    if (!VALID.includes(status)) throw new Error("INVALID_STATUS");
    return this.repo.updateStatus(id, status);
  }
}
