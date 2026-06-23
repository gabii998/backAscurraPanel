import type { ClientRepository, ListClientsFilter } from "../../domain/repositories/ClientRepository";
import type { Client, ClientStatus } from "../../domain/entities/Client";
import { prisma } from "../db/prisma";

export class PrismaClientRepository implements ClientRepository {
  async findById(id: string): Promise<Client | null> {
    const row = await prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: { projects: true },
    });
    return row ? this.toEntity(row) : null;
  }

  async list(filter: ListClientsFilter): Promise<Client[]> {
    const rows = await prisma.client.findMany({
      where: {
        deletedAt: null,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.query
          ? {
              OR: [
                { company: { contains: filter.query, mode: "insensitive" } },
                { contactName: { contains: filter.query, mode: "insensitive" } },
                { contactEmail: { contains: filter.query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { projects: true },
      orderBy: { lastActivity: "desc" },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(client: Client): Promise<Client> {
    await prisma.client.create({
      data: {
        id: client.id,
        company: client.company,
        industry: client.industry,
        contactName: client.contactName,
        contactEmail: client.contactEmail,
        status: client.status,
        contractSince: client.contractSince,
        lastActivity: client.lastActivity,
        initials: client.initials,
        color: client.color,
        createdAt: client.createdAt,
        deletedAt: null,
      },
    });
    return client;
  }

  async update(
    id: string,
    data: Partial<Omit<Client, "id" | "createdAt" | "deletedAt" | "projectIds">>
  ): Promise<Client | null> {
    const existing = await prisma.client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    await prisma.client.update({ where: { id }, data });
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await prisma.client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return false;
    await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  private toEntity(row: {
    id: string;
    company: string;
    industry: string;
    contactName: string;
    contactEmail: string;
    status: string;
    contractSince: string | null;
    lastActivity: Date;
    initials: string;
    color: string;
    createdAt: Date;
    deletedAt: Date | null;
    projects: { projectId: string }[];
  }): Client {
    return {
      id: row.id,
      company: row.company,
      industry: row.industry,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      status: row.status as ClientStatus,
      contractSince: row.contractSince,
      lastActivity: row.lastActivity,
      initials: row.initials,
      color: row.color,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
      projectIds: row.projects.map((p) => p.projectId),
    };
  }
}
