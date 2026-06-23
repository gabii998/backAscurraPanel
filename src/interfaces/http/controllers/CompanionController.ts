import { type Request, type Response } from "express";
import { type AuthRequest } from "../../../infrastructure/http/express/middleware/authMiddleware";

const ACTIVE_THRESHOLD_MS = 35_000;

// In-memory per-user last-seen store — resets on server restart, no DB needed
const pingStore = new Map<string, number>();

export class CompanionController {
  handlePing = (_req: Request, res: Response): void => {
    const userId = (_req as AuthRequest).user.userId;
    pingStore.set(userId, Date.now());
    res.status(204).end();
  };

  handleStatus = (_req: Request, res: Response): void => {
    const userId = (_req as AuthRequest).user.userId;
    const lastSeen = pingStore.get(userId);
    const active =
      lastSeen !== undefined &&
      Date.now() - lastSeen < ACTIVE_THRESHOLD_MS;
    res.json({
      active,
      lastSeen: lastSeen ? new Date(lastSeen).toISOString() : null,
    });
  };
}
