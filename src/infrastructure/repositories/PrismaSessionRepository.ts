import { prisma } from "../db/prisma";
import type { SessionRepository } from "../../domain/repositories/SessionRepository";
import type { Session } from "../../domain/entities/Session";

const FIVE_MIN_MS = 5 * 60 * 1000;

export class PrismaSessionRepository implements SessionRepository {
  async create(data: Omit<Session, "createdAt" | "lastSeenAt">): Promise<void> {
    await prisma.session.create({
      data: {
        id: data.id,
        jti: data.jti,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
        revokedAt: data.revokedAt,
      },
    });
  }

  async findByJti(jti: string): Promise<Session | null> {
    const row = await prisma.session.findUnique({ where: { jti } });
    return row ?? null;
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
    });
  }

  async revoke(id: string, userId: string): Promise<boolean> {
    const result = await prisma.session.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  }

  async touchLastSeen(jti: string): Promise<void> {
    const row = await prisma.session.findUnique({ where: { jti }, select: { lastSeenAt: true } });
    if (!row) return;
    if (Date.now() - row.lastSeenAt.getTime() > FIVE_MIN_MS) {
      await prisma.session.update({ where: { jti }, data: { lastSeenAt: new Date() } });
    }
  }
}
