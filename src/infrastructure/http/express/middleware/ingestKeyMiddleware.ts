import { createHash } from "crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ApiKeyRepository } from "../../../../domain/repositories/ApiKeyRepository";
import type { ApiKey } from "../../../../domain/entities/ApiKey";

export interface ApiKeyRequest extends Request {
  apiKey: ApiKey;
}

export const buildIngestKeyMiddleware = (repo: ApiKeyRepository): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const raw = req.header("x-api-key") ?? "";
    if (!raw) {
      res.status(401).json({ message: "INVALID_API_KEY" });
      return;
    }
    const hash = createHash("sha256").update(raw).digest("hex");
    const key = await repo.findByKeyHash(hash);
    if (!key || key.revokedAt) {
      res.status(401).json({ message: "INVALID_API_KEY" });
      return;
    }
    (req as ApiKeyRequest).apiKey = key;
    next();
  };
