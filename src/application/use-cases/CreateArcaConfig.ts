import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaConfigPublic, ArcaConfigInput } from "../../domain/entities/ArcaConfig";

export class CreateArcaConfig {
  constructor(private configRepo: ArcaConfigRepository) {}

  async execute(data: ArcaConfigInput): Promise<ArcaConfigPublic> {
    if (!data.name || !data.cuit || !data.cert || !data.privateKey) {
      throw new Error("MISSING_FIELDS");
    }
    const config = await this.configRepo.create(data);
    const { cert: _cert, privateKey: _key, ...pub } = config;
    return pub;
  }
}
