import type { Request, Response } from "express";
import type { CreateProspect } from "../../../application/use-cases/CreateProspect";
import type { BulkCreateProspects } from "../../../application/use-cases/BulkCreateProspects";
import type { ListProspects } from "../../../application/use-cases/ListProspects";
import type { UpdateProspect } from "../../../application/use-cases/UpdateProspect";
import type { DeleteProspect } from "../../../application/use-cases/DeleteProspect";

export class ProspectController {
  constructor(
    private readonly createProspect:      CreateProspect,
    private readonly bulkCreateProspects: BulkCreateProspects,
    private readonly listProspects:       ListProspects,
    private readonly updateProspect:      UpdateProspect,
    private readonly deleteProspect:      DeleteProspect,
  ) {}

  async handleCreate(req: Request, res: Response): Promise<void> {
    const { name, city } = req.body as Record<string, string | undefined>;
    if (!name || !city) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }
    const prospect = await this.createProspect.execute(req.body);
    res.status(201).json(prospect);
  }

  async handleBulkCreate(req: Request, res: Response): Promise<void> {
    const { results } = req.body as { results?: unknown[] };
    if (!Array.isArray(results)) {
      res.status(400).json({ message: "MISSING_RESULTS" });
      return;
    }
    const count = await this.bulkCreateProspects.execute(results as Parameters<BulkCreateProspects["execute"]>[0]);
    res.status(201).json({ created: count });
  }

  async handleList(req: Request, res: Response): Promise<void> {
    const { stage } = req.query as Record<string, string | undefined>;
    const prospects = await this.listProspects.execute({ stage });
    res.json(prospects);
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
    try {
      const prospect = await this.updateProspect.execute(req.params.id, req.body);
      res.json(prospect);
    } catch {
      res.status(404).json({ message: "NOT_FOUND" });
    }
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteProspect.execute(req.params.id);
      res.status(204).send();
    } catch {
      res.status(404).json({ message: "NOT_FOUND" });
    }
  }
}
