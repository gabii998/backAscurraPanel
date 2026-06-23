import type { Request, Response } from "express";
import type { GetWorkspace } from "../../../application/use-cases/GetWorkspace";
import type { UpdateWorkspace } from "../../../application/use-cases/UpdateWorkspace";

export class WorkspaceController {
  constructor(
    private readonly getWorkspace: GetWorkspace,
    private readonly updateWorkspace: UpdateWorkspace
  ) {}

  async handleGet(_req: Request, res: Response): Promise<void> {
    const workspace = await this.getWorkspace.execute();
    res.json(workspace);
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
    const { name, timezone, language } = req.body as Record<string, string>;
    const workspace = await this.updateWorkspace.execute({ name, timezone, language });
    res.json(workspace);
  }
}
