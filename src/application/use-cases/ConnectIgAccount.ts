import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { Brand } from "../../domain/entities/Brand";
import type { EncryptionService } from "../../infrastructure/services/EncryptionService";

export class ConnectIgAccount {
  constructor(
    private brandRepo:   BrandRepository,
    private encryption: EncryptionService,
  ) {}

  async execute(brandId: string, igUserId: string, igAccessToken: string): Promise<Brand> {
    const brand = await this.brandRepo.findById(brandId);
    if (!brand) throw new Error("BRAND_NOT_FOUND");
    const encryptedToken = this.encryption.encrypt(igAccessToken);
    return this.brandRepo.update(brandId, { igUserId, igAccessToken: encryptedToken });
  }

  async disconnect(brandId: string): Promise<Brand> {
    const brand = await this.brandRepo.findById(brandId);
    if (!brand) throw new Error("BRAND_NOT_FOUND");
    return this.brandRepo.update(brandId, { igUserId: "", igAccessToken: "" });
  }
}
