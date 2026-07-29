import { prisma } from "../db/prisma";
import { randomUUID } from "crypto";
import type { MercadoPagoConfigRepository } from "../../domain/repositories/MercadoPagoConfigRepository";
import type { MercadoPagoConfig, MercadoPagoConfigInput } from "../../domain/entities/MercadoPagoConfig";

const selectConfigSql = `
  SELECT id, name, "accessToken", "publicKey", "mercadoPagoWebhookSecret",
    "webhookSecret", "webhookUrl", "backUrlSuccess", "backUrlFailure",
    "backUrlPending", "apiKeyId", "updatedAt", "createdAt"
  FROM "MercadoPagoConfig"
`;

export class PrismaMercadoPagoConfigRepository implements MercadoPagoConfigRepository {
  async list(): Promise<MercadoPagoConfig[]> {
    return prisma.$queryRawUnsafe<MercadoPagoConfig[]>(`${selectConfigSql} ORDER BY "createdAt" DESC`);
  }

  async getById(id: string): Promise<MercadoPagoConfig | null> {
    const rows = await prisma.$queryRawUnsafe<MercadoPagoConfig[]>(
      `${selectConfigSql} WHERE id = $1 LIMIT 1`,
      id
    );
    return rows[0] ?? null;
  }

  async getByName(name: string): Promise<MercadoPagoConfig | null> {
    const rows = await prisma.$queryRawUnsafe<MercadoPagoConfig[]>(
      `${selectConfigSql} WHERE name = $1 LIMIT 1`,
      name
    );
    return rows[0] ?? null;
  }

  async getByApiKeyId(apiKeyId: string): Promise<MercadoPagoConfig | null> {
    const rows = await prisma.$queryRawUnsafe<MercadoPagoConfig[]>(
      `${selectConfigSql} WHERE "apiKeyId" = $1 LIMIT 1`,
      apiKeyId
    );
    return rows[0] ?? null;
  }

  async create(data: MercadoPagoConfigInput): Promise<MercadoPagoConfig> {
    const rows = await prisma.$queryRawUnsafe<MercadoPagoConfig[]>(
      `
        INSERT INTO "MercadoPagoConfig"
          (id, name, "accessToken", "publicKey", "webhookSecret", "webhookUrl",
           "mercadoPagoWebhookSecret", "backUrlSuccess", "backUrlFailure", "backUrlPending", "apiKeyId", "updatedAt", "createdAt")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id, name, "accessToken", "publicKey", "mercadoPagoWebhookSecret",
          "webhookSecret", "webhookUrl", "backUrlSuccess", "backUrlFailure",
          "backUrlPending", "apiKeyId", "updatedAt", "createdAt"
      `,
      randomUUID(),
      data.name,
      data.accessToken,
      data.publicKey,
      data.webhookSecret,
      data.webhookUrl,
      data.mercadoPagoWebhookSecret,
      data.backUrlSuccess,
      data.backUrlFailure,
      data.backUrlPending,
      data.apiKeyId ?? null
    );
    return rows[0];
  }

  async update(id: string, data: Partial<MercadoPagoConfigInput>): Promise<MercadoPagoConfig> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("CONFIG_NOT_FOUND");
    }
    const next = { ...existing, ...data };
    const rows = await prisma.$queryRawUnsafe<MercadoPagoConfig[]>(
      `
        UPDATE "MercadoPagoConfig"
        SET name = $2, "accessToken" = $3, "publicKey" = $4, "webhookSecret" = $5,
          "webhookUrl" = $6, "mercadoPagoWebhookSecret" = $7,
          "backUrlSuccess" = $8, "backUrlFailure" = $9,
          "backUrlPending" = $10, "apiKeyId" = $11, "updatedAt" = NOW()
        WHERE id = $1
        RETURNING id, name, "accessToken", "publicKey", "mercadoPagoWebhookSecret",
          "webhookSecret", "webhookUrl", "backUrlSuccess", "backUrlFailure",
          "backUrlPending", "apiKeyId", "updatedAt", "createdAt"
      `,
      id,
      next.name,
      next.accessToken,
      next.publicKey,
      next.webhookSecret,
      next.webhookUrl,
      next.mercadoPagoWebhookSecret,
      next.backUrlSuccess,
      next.backUrlFailure,
      next.backUrlPending,
      next.apiKeyId ?? null
    );
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await prisma.mercadoPagoConfig.delete({ where: { id } });
  }
}
