import { randomUUID } from "crypto";
import type { ContactRequest } from "../../domain/entities/ContactRequest";
import type { ContactRequestRepository } from "../../domain/repositories/ContactRequestRepository";

export class CreateContactRequest {
  constructor(private readonly repo: ContactRequestRepository) {}

  async execute(data: { phone: string; email: string; message: string }): Promise<ContactRequest> {
    if (!data.phone || !data.email || !data.message) throw new Error("MISSING_FIELDS");
    return this.repo.create({ ...data, status: "new" });
  }
}
