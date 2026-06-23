import type { SessionRepository } from "../../domain/repositories/SessionRepository";

export interface SessionDto {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export class GetActiveSessions {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(userId: string, currentJti: string): Promise<SessionDto[]> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);
    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      isCurrent: s.jti === currentJti,
    }));
  }
}
