import type { Request, Response, NextFunction } from "express";
import type { TokenService } from "../../../../application/services/TokenService";
import type { SessionRepository } from "../../../../domain/repositories/SessionRepository";

export type AuthRequest = Request & { user: { userId: string; email: string; role: string; jti: string } };

export const buildAuthMiddleware = (tokenService: TokenService, sessionRepository: SessionRepository) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.header("authorization") ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";

      if (!token) {
        res.status(401).json({ message: "MISSING_TOKEN" });
        return;
      }

      const payload = tokenService.verify(token);
      if (!payload?.userId || !payload?.jti) {
        res.status(401).json({ message: "INVALID_TOKEN" });
        return;
      }

      const session = await sessionRepository.findByJti(payload.jti);
      if (!session || session.revokedAt !== null || session.expiresAt < new Date()) {
        res.status(401).json({ message: "SESSION_REVOKED" });
        return;
      }

      void sessionRepository.touchLastSeen(payload.jti);

      (req as AuthRequest).user = { userId: payload.userId, email: payload.email, role: payload.role, jti: payload.jti };
      next();
    } catch (error) {
      next(error);
    }
  };
};
