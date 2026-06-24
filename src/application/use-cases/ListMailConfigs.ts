import type { MailConfigRepository } from "../../domain/repositories/MailConfigRepository";
import type { MailConfig } from "../../domain/entities/MailConfig";

export type MailConfigPublic = Omit<MailConfig, "pass">;

function toPublic(c: MailConfig): MailConfigPublic {
  const { pass: _pass, ...rest } = c;
  return rest;
}

export class ListMailConfigs {
  constructor(private repo: MailConfigRepository) {}

  async execute(): Promise<MailConfigPublic[]> {
    return (await this.repo.list()).map(toPublic);
  }
}
