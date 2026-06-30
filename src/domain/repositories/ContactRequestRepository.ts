import type { ContactRequest, ContactRequestStatus } from "../entities/ContactRequest";

export interface ContactRequestRepository {
  create(data: Omit<ContactRequest, "id" | "createdAt">): Promise<ContactRequest>;
  list(): Promise<ContactRequest[]>;
  updateStatus(id: string, status: ContactRequestStatus): Promise<ContactRequest>;
}
