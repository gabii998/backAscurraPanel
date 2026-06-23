import { prisma } from "../db/prisma";
import type { ApiKeyRepository } from "../../domain/repositories/ApiKeyRepository";
import type { ApiKey } from "../../domain/entities/ApiKey";
import type { ApiKey as PrismaApiKey } from "@prisma/client";

const toEntity = (row: PrismaApiKey): ApiKey => ({
  id: row.id,
  name: row.name,
  keyHash: row.keyHash,
  prefix: row.prefix,
  createdAt: row.createdAt,
  revokedAt: row.revokedAt,
});

export class PrismaApiKeyRepository implements ApiKeyRepository {
  async findByKeyHash(hash: string): Promise<ApiKey | null> {
    const row = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    return row ? toEntity(row) : null;
  }

  async list(): Promise<ApiKey[]> {
    const rows = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toEntity);
  }

  async create(key: ApiKey): Promise<ApiKey> {
    const row = await prisma.apiKey.create({
      data: {
        id: key.id,
        name: key.name,
        keyHash: key.keyHash,
        prefix: key.prefix,
        createdAt: key.createdAt,
      },
    });
    return toEntity(row);
  }

  async revoke(id: string): Promise<boolean> {
    try {
      await prisma.apiKey.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }
}
