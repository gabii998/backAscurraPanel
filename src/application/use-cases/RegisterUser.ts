import { randomUUID } from "crypto";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { PasswordHasher } from "../services/PasswordHasher";
import type { TokenService } from "../services/TokenService";
import type { UserCreateData } from "../../domain/model/UserCreateData";
import type { User } from "../../domain/entities/User";

export interface RegisterUserResult {
  user: User;
  token: string;
  jti: string;
  expiresAt: Date;
}

export class RegisterUser {
  constructor(
    private readonly repository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(data: UserCreateData): Promise<RegisterUserResult> {
    const existing = await this.repository.findByEmail(data.email);
    if (existing) throw new Error("EMAIL_TAKEN");

    const user: User = {
      id: randomUUID(),
      name: data.name,
      email: data.email.toLowerCase().trim(),
      password: this.passwordHasher.hash(data.password),
      role: data.role ?? "member",
      initials: data.initials,
      color: data.color,
      bio: "",
      createdAt: new Date(),
      deletedAt: null,
    };

    await this.repository.create(user);

    const { token, jti, expiresAt } = this.tokenService.generate({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token, jti, expiresAt };
  }
}
