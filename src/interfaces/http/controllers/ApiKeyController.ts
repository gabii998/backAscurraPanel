import type { Request, Response } from "express";
import type { CreateApiKey } from "../../../application/use-cases/CreateApiKey";
import type { ListApiKeys } from "../../../application/use-cases/ListApiKeys";
import type { RevokeApiKey } from "../../../application/use-cases/RevokeApiKey";

export class ApiKeyController {
  constructor(
    private readonly createApiKey: CreateApiKey,
    private readonly listApiKeys: ListApiKeys,
    private readonly revokeApiKey: RevokeApiKey,
  ) {}

  async handleCreate(req: Request, res: Response): Promise<void> {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ message: "name is required" });
      return;
    }
    const { apiKey, rawKey } = await this.createApiKey.execute(name);
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      createdAt: apiKey.createdAt,
      key: rawKey,
    });
  }

  async handleList(_req: Request, res: Response): Promise<void> {
    const keys = await this.listApiKeys.execute();
    res.json(keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt,
    })));
  }

  async handleRevoke(req: Request, res: Response): Promise<void> {
    try {
      await this.revokeApiKey.execute(req.params.id);
      res.status(204).send();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "API_KEY_NOT_FOUND") {
        res.status(404).json({ message: "API key not found" });
        return;
      }
      throw err;
    }
  }
}
