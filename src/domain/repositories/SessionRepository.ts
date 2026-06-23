import type { Session } from "../entities/Session";

export interface SessionRepository {
  create(data: Omit<Session, "createdAt" | "lastSeenAt">): Promise<void>;
  findByJti(jti: string): Promise<Session | null>;
  findActiveByUserId(userId: string): Promise<Session[]>;
  revoke(id: string, userId: string): Promise<boolean>;
  touchLastSeen(jti: string): Promise<void>;
}
