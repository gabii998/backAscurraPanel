import { prisma } from "../db/prisma";
import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaConfig, ArcaApiKeyRef, ArcaConfigInput } from "../../domain/entities/ArcaConfig";
import type { EncryptionService } from "../services/EncryptionService";
import { parseCertExpiry } from "../services/CertService";

export class PrismaArcaConfigRepository implements ArcaConfigRepository {
  constructor(private encryption: EncryptionService) {}

  private toEntity(row: {
    id: string;
    name: string;
    cuit: string;
    cert: string;
    privateKey: string;
    production: boolean;
    certExpiryNotifiedAt: Date | null;
    updatedAt: Date;
    createdAt: Date;
  }): ArcaConfig {
    const cert = this.encryption.isEncrypted(row.cert) ? this.encryption.decrypt(row.cert) : row.cert;
    const privateKey = this.encryption.isEncrypted(row.privateKey) ? this.encryption.decrypt(row.privateKey) : row.privateKey;
    return {
      id: row.id,
      name: row.name,
      cuit: row.cuit,
      cert,
      privateKey,
      production: row.production,
      certExpiresAt: parseCertExpiry(cert),
      certExpiryNotifiedAt: row.certExpiryNotifiedAt,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  }

  async list(): Promise<ArcaConfig[]> {
    const rows = await prisma.arcaConfig.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toEntity(r));
  }

  async listWithApiKeys(): Promise<(ArcaConfig & { apiKeys: ArcaApiKeyRef[] })[]> {
    const rows = await prisma.arcaConfig.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        apiKeys: {
          include: { apiKey: { select: { id: true, name: true } } },
        },
      },
    });
    return rows.map((r) => ({
      ...this.toEntity(r),
      apiKeys: r.apiKeys.map((j) => ({ id: j.apiKey.id, name: j.apiKey.name })),
    }));
  }

  async getById(id: string): Promise<ArcaConfig | null> {
    const row = await prisma.arcaConfig.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async getByApiKeyId(apiKeyId: string): Promise<ArcaConfig | null> {
    const junction = await prisma.arcaConfigApiKey.findUnique({
      where: { apiKeyId },
      include: { config: true },
    });
    return junction ? this.toEntity(junction.config) : null;
  }

  async create(data: ArcaConfigInput): Promise<ArcaConfig> {
    const row = await prisma.arcaConfig.create({
      data: {
        name: data.name,
        cuit: data.cuit,
        cert: this.encryption.encrypt(data.cert),
        privateKey: this.encryption.encrypt(data.privateKey),
        production: data.production,
      },
    });
    return this.toEntity(row);
  }

  async update(id: string, data: Partial<ArcaConfigInput> & { certExpiryNotifiedAt?: Date | null }): Promise<ArcaConfig> {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.cuit !== undefined) patch.cuit = data.cuit;
    if (data.production !== undefined) patch.production = data.production;
    if (data.cert !== undefined) patch.cert = this.encryption.encrypt(data.cert);
    if (data.privateKey !== undefined) patch.privateKey = this.encryption.encrypt(data.privateKey);
    if ("certExpiryNotifiedAt" in data) patch.certExpiryNotifiedAt = data.certExpiryNotifiedAt ?? null;

    const row = await prisma.arcaConfig.update({ where: { id }, data: patch });
    return this.toEntity(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.arcaConfig.delete({ where: { id } });
  }

  async assignApiKey(configId: string, apiKeyId: string): Promise<void> {
    await prisma.arcaConfigApiKey.upsert({
      where: { apiKeyId },
      update: { configId },
      create: { configId, apiKeyId },
    });
  }

  async unassignApiKey(apiKeyId: string): Promise<void> {
    await prisma.arcaConfigApiKey.deleteMany({ where: { apiKeyId } });
  }

  async updateCertExpiryNotifiedAt(id: string, date: Date | null): Promise<void> {
    await prisma.arcaConfig.update({ where: { id }, data: { certExpiryNotifiedAt: date } });
  }
}
