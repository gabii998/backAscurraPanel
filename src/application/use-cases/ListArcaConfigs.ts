import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaConfigPublic } from "../../domain/entities/ArcaConfig";

export class ListArcaConfigs {
  constructor(private configRepo: ArcaConfigRepository) {}

  async execute(): Promise<ArcaConfigPublic[]> {
    const configs = await this.configRepo.list();
    return configs.map(({ cert: _cert, privateKey: _key, ...pub }) => pub as ArcaConfigPublic);
  }
}
