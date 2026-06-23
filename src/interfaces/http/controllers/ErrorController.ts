import type { Request, Response } from "express";
import type { IngestError } from "../../../application/use-cases/IngestError";
import type { ListErrors } from "../../../application/use-cases/ListErrors";
import type { GetError } from "../../../application/use-cases/GetError";
import type { UpdateErrorStatus } from "../../../application/use-cases/UpdateErrorStatus";
import type { DeleteError } from "../../../application/use-cases/DeleteError";
import type { ErrorSeverity, ErrorStatus } from "../../../domain/entities/AppError";

export class ErrorController {
  constructor(
    private readonly ingestError: IngestError,
    private readonly listErrors: ListErrors,
    private readonly getError: GetError,
    private readonly updateErrorStatus: UpdateErrorStatus,
    private readonly deleteError: DeleteError
  ) {}

  async handleIngest(req: Request, res: Response): Promise<void> {
    const { type, message } = req.body as Record<string, string | undefined>;
    if (!type || !message) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }
    const error = await this.ingestError.execute(req.body);
    res.status(201).json(error);
  }

  async handleList(req: Request, res: Response): Promise<void> {
    const { severity, status, projectId, q } = req.query as Record<string, string | undefined>;
    const errors = await this.listErrors.execute({
      severity:  severity  as ErrorSeverity | undefined,
      status:    status    as ErrorStatus   | undefined,
      projectId,
      query: q,
    });
    res.json(errors);
  }

  async handleGet(req: Request, res: Response): Promise<void> {
    try {
      const error = await this.getError.execute(req.params.id);
      res.json(error);
    } catch (e) {
      if (e instanceof Error && e.message === "ERROR_NOT_FOUND") {
        res.status(404).json({ message: "ERROR_NOT_FOUND" });
        return;
      }
      throw e;
    }
  }

  async handleUpdateStatus(req: Request, res: Response): Promise<void> {
    const { status } = req.body as { status?: ErrorStatus };
    if (!status) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }
    try {
      const error = await this.updateErrorStatus.execute(req.params.id, status);
      res.json(error);
    } catch (e) {
      if (e instanceof Error && e.message === "ERROR_NOT_FOUND") {
        res.status(404).json({ message: "ERROR_NOT_FOUND" });
        return;
      }
      throw e;
    }
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteError.execute(req.params.id);
      res.status(204).send();
    } catch (e) {
      if (e instanceof Error && e.message === "ERROR_NOT_FOUND") {
        res.status(404).json({ message: "ERROR_NOT_FOUND" });
        return;
      }
      throw e;
    }
  }
}
