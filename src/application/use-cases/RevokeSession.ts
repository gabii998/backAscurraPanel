import type { SessionRepository } from "../../domain/repositories/SessionRepository";

export class RevokeSession {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(sessionId: string, userId: string): Promise<void> {
    const ok = await this.sessionRepository.revoke(sessionId, userId);
    if (!ok) throw new Error("SESSION_NOT_FOUND");
  }
}
