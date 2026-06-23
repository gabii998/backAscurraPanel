import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { PasswordHasher } from "../services/PasswordHasher";
import type { TokenService } from "../services/TokenService";
import type { User } from "../../domain/entities/User";

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserResult {
  user: User;
  token: string;
  jti: string;
  expiresAt: Date;
}

export class LoginUser {
  constructor(
    private readonly repository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserResult> {
    const user = await this.repository.findByEmail(input.email.toLowerCase().trim());
    if (!user || !this.passwordHasher.compare(input.password, user.password)) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const { token, jti, expiresAt } = this.tokenService.generate({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token, jti, expiresAt };
  }
}
