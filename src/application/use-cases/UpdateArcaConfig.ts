import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaConfigPublic, ArcaConfigInput } from "../../domain/entities/ArcaConfig";

export class UpdateArcaConfig {
  constructor(private configRepo: ArcaConfigRepository) {}

  async execute(id: string, data: Partial<ArcaConfigInput>): Promise<ArcaConfigPublic> {
    const existing = await this.configRepo.getById(id);
    if (!existing) throw new Error("ARCA_CONFIG_NOT_FOUND");

    const patch: Partial<ArcaConfigInput> = { ...data };
    if (!patch.cert) delete patch.cert;
    if (!patch.privateKey) delete patch.privateKey;

    const config = await this.configRepo.update(id, patch);
    const { cert: _cert, privateKey: _key, ...pub } = config;
    return pub;
  }
}
