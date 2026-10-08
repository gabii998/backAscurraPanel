import { Prisma } from "@prisma/client";
import type { PendingSynchronizationRepository } from "../../domain/repositories/PendingSynchronizationRepository";
import type { PendingSynchronization } from "../../domain/entities/PendingSynchronization";
import { prisma } from "../db/prisma";

export class PrismaPendingSynchronizationRepository implements PendingSynchronizationRepository {
  async create(item: PendingSynchronization): Promise<boolean> {
    try {
      await prisma.pendingSynchronization.create({
        data: {
          id: item.id, clientItemId: item.clientItemId, apiKeyId: item.apiKeyId,
          type: item.type, message: item.message, severity: item.severity ?? "error",
          stackTrace: item.stackTrace ?? "", meta: item.meta ? JSON.parse(JSON.stringify(item.meta)) : Prisma.JsonNull,
          receivedAt: item.receivedAt,
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  }

  async list(): Promise<PendingSynchronization[]> {
    const rows = await prisma.pendingSynchronization.findMany({ orderBy: { receivedAt: "desc" } });
    return rows.map(row => ({
      id: row.id, clientItemId: row.clientItemId, apiKeyId: row.apiKeyId,
      type: row.type, message: row.message, severity: row.severity as PendingSynchronization["severity"],
      stackTrace: row.stackTrace, meta: (row.meta ?? undefined) as PendingSynchronization["meta"], receivedAt: row.receivedAt,
    }));
  }
}
