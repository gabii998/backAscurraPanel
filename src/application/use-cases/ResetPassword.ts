import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { PasswordHasher } from "../services/PasswordHasher";

export class ResetPassword {
  constructor(
    private readonly repository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const user = await this.repository.findByResetToken(token);
    if (!user) throw new Error("INVALID_TOKEN");

    const newHash = this.passwordHasher.hash(newPassword);
    await this.repository.changePassword(user.id, newHash);
    await this.repository.clearResetToken(user.id);
  }
}
