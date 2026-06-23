import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { PasswordHasher } from "../services/PasswordHasher";

export class ChangePassword {
  constructor(
    private readonly repository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");

    if (!this.passwordHasher.compare(currentPassword, user.password)) {
      throw new Error("WRONG_PASSWORD");
    }

    if (currentPassword === newPassword) {
      throw new Error("SAME_PASSWORD");
    }

    const newHash = this.passwordHasher.hash(newPassword);
    await this.repository.changePassword(id, newHash);
  }
}
