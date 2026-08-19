import type { Request, Response } from "express";
import type { CreateErrorConfig } from "../../../application/use-cases/CreateErrorConfig";
import type { ListErrorConfigs } from "../../../application/use-cases/ListErrorConfigs";
import type { GetErrorConfig } from "../../../application/use-cases/GetErrorConfig";
import type { DeleteErrorConfig } from "../../../application/use-cases/DeleteErrorConfig";

export class ErrorConfigController {
  constructor(
    private readonly createErrorConfig: CreateErrorConfig,
    private readonly listErrorConfigs: ListErrorConfigs,
    private readonly getErrorConfig: GetErrorConfig,
    private readonly deleteErrorConfig: DeleteErrorConfig,
  ) {}

  async handleCreate(req: Request, res: Response): Promise<void> {
    const { name, apiKeyId } = req.body as Record<string, string | undefined>;
    if (!name) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }
    try {
      const config = await this.createErrorConfig.execute({ name, apiKeyId });
      const detail = await this.getErrorConfig.execute(config.id);
      res.status(201).json(detail);
    } catch (error) {
      if (error instanceof Error && error.message === "API_KEY_ALREADY_ASSIGNED") {
        res.status(409).json({ message: "API_KEY_ALREADY_ASSIGNED" });
        return;
      }
      throw error;
    }
  }

  async handleList(_req: Request, res: Response): Promise<void> {
    const configs = await this.listErrorConfigs.execute();
    res.json(configs);
  }

  async handleGet(req: Request, res: Response): Promise<void> {
    const config = await this.getErrorConfig.execute(req.params.id);
    if (!config) {
      res.status(404).json({ message: "NOT_FOUND" });
      return;
    }
    res.json(config);
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteErrorConfig.execute(req.params.id);
      res.status(204).send();
    } catch {
      res.status(404).json({ message: "NOT_FOUND" });
    }
  }
}
