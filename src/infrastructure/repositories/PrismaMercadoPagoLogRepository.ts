import { prisma } from "../db/prisma";
import type { MercadoPagoLogRepository } from "../../domain/repositories/MercadoPagoLogRepository";
import type { MercadoPagoLog } from "../../domain/entities/MercadoPagoLog";

export class PrismaMercadoPagoLogRepository implements MercadoPagoLogRepository {
  async create(log: Omit<MercadoPagoLog, "id" | "updatedAt" | "createdAt">): Promise<MercadoPagoLog> {
    const rows = await prisma.$queryRawUnsafe<MercadoPagoLog[]>(
      `
        INSERT INTO "MercadoPagoLog"
          (id, "configId", "externalReference", "preferenceId", "paymentId",
           "checkoutUrl", status, amount, currency, request, response,
           "webhookPayload", "forwardStatusCode", "forwardResponse", error,
           "updatedAt", "createdAt")
        VALUES
          (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8,
           $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, NOW(), NOW())
        RETURNING *
      `,
      log.configId,
      log.externalReference,
      log.preferenceId,
      log.paymentId,
      log.checkoutUrl,
      log.status,
      log.amount,
      log.currency,
      toJson(log.request),
      toJson(log.response),
      toJson(log.webhookPayload),
      log.forwardStatusCode ?? null,
      log.forwardResponse ?? "",
      log.error
    );
    return rows[0];
  }

  async list(configId: string, limit = 50): Promise<MercadoPagoLog[]> {
    return prisma.$queryRawUnsafe<MercadoPagoLog[]>(
      `SELECT * FROM "MercadoPagoLog" WHERE "configId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
      configId,
      limit
    );
  }

  async getByExternalReference(externalReference: string, configId: string): Promise<MercadoPagoLog | null> {
    const rows = await prisma.$queryRawUnsafe<MercadoPagoLog[]>(
      `SELECT * FROM "MercadoPagoLog" WHERE "externalReference" = $1 AND "configId" = $2 ORDER BY "createdAt" DESC LIMIT 1`,
      externalReference,
      configId
    );
    return rows[0] ?? null;
  }

  async updateStatus(id: string, data: {
    status: string;
    paymentId: string;
    amount: number;
    currency: string;
    webhookPayload: unknown;
    paymentResponse: unknown;
    forwardStatusCode?: number | null;
    forwardResponse?: string;
  }): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "MercadoPagoLog"
        SET status = $2, "paymentId" = $3, amount = $4, currency = $5,
          "webhookPayload" = $6::jsonb, response = $7::jsonb,
          "forwardStatusCode" = $8, "forwardResponse" = $9,
          "updatedAt" = NOW()
        WHERE id = $1
      `,
      id,
      data.status,
      data.paymentId,
      data.amount,
      data.currency,
      toJson(data.webhookPayload),
      toJson(data.paymentResponse),
      data.forwardStatusCode ?? null,
      data.forwardResponse ?? ""
    );
  }
}

const toJson = (value: unknown): string | null =>
  value === undefined || value === null ? null : JSON.stringify(value);
