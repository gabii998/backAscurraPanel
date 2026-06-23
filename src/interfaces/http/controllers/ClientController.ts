import type { Request, Response } from "express";
import type { CreateClient } from "../../../application/use-cases/CreateClient";
import type { ListClients } from "../../../application/use-cases/ListClients";
import type { GetClient } from "../../../application/use-cases/GetClient";
import type { UpdateClient } from "../../../application/use-cases/UpdateClient";
import type { DeleteClient } from "../../../application/use-cases/DeleteClient";
import type { ClientStatus } from "../../../domain/entities/Client";

export class ClientController {
  constructor(
    private readonly createClient: CreateClient,
    private readonly listClients: ListClients,
    private readonly getClient: GetClient,
    private readonly updateClient: UpdateClient,
    private readonly deleteClient: DeleteClient
  ) {}

  async handleList(req: Request, res: Response): Promise<void> {
    const { status, q } = req.query as Record<string, string | undefined>;
    const clients = await this.listClients.execute({
      status: status as ClientStatus | undefined,
      query: q,
    });
    res.json(clients);
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    const { company, industry, contactName, contactEmail, initials, color } = req.body as Record<string, string>;

    if (!company || !industry || !contactName || !contactEmail || !initials || !color) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }

    const client = await this.createClient.execute(req.body);
    res.status(201).json(client);
  }

  async handleGet(req: Request, res: Response): Promise<void> {
    try {
      const client = await this.getClient.execute(req.params.id);
      res.json(client);
    } catch (error) {
      if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
        res.status(404).json({ message: "CLIENT_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
    try {
      const client = await this.updateClient.execute(req.params.id, req.body);
      res.json(client);
    } catch (error) {
      if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
        res.status(404).json({ message: "CLIENT_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteClient.execute(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
        res.status(404).json({ message: "CLIENT_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }
}
