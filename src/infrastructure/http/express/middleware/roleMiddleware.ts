import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './authMiddleware';

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const role = (req as AuthRequest).user?.role;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ message: 'FORBIDDEN' });
      return;
    }
    next();
  };
