import type { MailConfigRepository } from "../../domain/repositories/MailConfigRepository";
import type { MailConfig } from "../../domain/entities/MailConfig";

export type MailConfigPublic = Omit<MailConfig, "pass">;

export interface UpdateMailConfigInput {
  name?: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

export class UpdateMailConfig {
  constructor(private repo: MailConfigRepository) {}

  async execute(id: string, input: UpdateMailConfigInput): Promise<MailConfigPublic> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error("CONFIG_NOT_FOUND");

    const data: UpdateMailConfigInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.host !== undefined) data.host = input.host;
    if (input.port !== undefined) data.port = input.port;
    if (input.user !== undefined) data.user = input.user;
    if (input.from !== undefined) data.from = input.from;
    if (input.pass)               data.pass = input.pass;  // only update pass if provided

    const updated = await this.repo.update(id, data);
    const { pass: _pass, ...rest } = updated;
    return rest;
  }
}
