import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { User } from "../../domain/entities/User";

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
  bio?: string;
}

export class UpdateUser {
  constructor(private readonly repository: UserRepository) {}

  async execute(id: string, data: UpdateUserData): Promise<User> {
    return this.repository.updateProfile(id, data);
  }
}
