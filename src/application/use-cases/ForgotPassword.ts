import { randomUUID } from "crypto";
import type { UserRepository } from "../../domain/repositories/UserRepository";

export class ForgotPassword {
  constructor(private readonly repository: UserRepository) {}

  async execute(email: string): Promise<string | null> {
    const token = randomUUID();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    const found = await this.repository.setResetToken(email, token, expiry);
    return found ? token : null;
  }
}
