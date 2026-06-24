import type { MailConfigRepository } from "../../domain/repositories/MailConfigRepository";
import type { MailConfig } from "../../domain/entities/MailConfig";

export type MailConfigPublic = Omit<MailConfig, "pass">;

export interface CreateMailConfigInput {
  name: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export class CreateMailConfig {
  constructor(private repo: MailConfigRepository) {}

  async execute(input: CreateMailConfigInput): Promise<MailConfigPublic> {
    if (!input.name || !input.host || !input.port || !input.user || !input.pass || !input.from) {
      throw new Error("MISSING_FIELDS");
    }
    const created = await this.repo.create(input);
    const { pass: _pass, ...rest } = created;
    return rest;
  }
}
