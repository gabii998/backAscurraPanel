import type { UserRepository, UserWithStats } from "../../domain/repositories/UserRepository";

export class ListUsers {
  constructor(private readonly repository: UserRepository) {}

  async execute(): Promise<UserWithStats[]> {
    return this.repository.list();
  }
}
