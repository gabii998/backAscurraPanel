import { prisma } from "../db/prisma";
import type { ContactRequestRepository } from "../../domain/repositories/ContactRequestRepository";
import type { ContactRequest, ContactRequestStatus } from "../../domain/entities/ContactRequest";

export class PrismaContactRequestRepository implements ContactRequestRepository {
  async create(data: Omit<ContactRequest, "id" | "createdAt">): Promise<ContactRequest> {
    return prisma.contactRequest.create({ data }) as Promise<ContactRequest>;
  }

  async list(): Promise<ContactRequest[]> {
    return prisma.contactRequest.findMany({
      orderBy: { createdAt: "desc" },
    }) as Promise<ContactRequest[]>;
  }

  async updateStatus(id: string, status: ContactRequestStatus): Promise<ContactRequest> {
    return prisma.contactRequest.update({
      where: { id },
      data: { status },
    }) as Promise<ContactRequest>;
  }
}
