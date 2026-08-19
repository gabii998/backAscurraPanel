import type { Request, Response } from "express";
import type { IngestError } from "../../../application/use-cases/IngestError";
import type { ListErrors } from "../../../application/use-cases/ListErrors";
import type { GetError } from "../../../application/use-cases/GetError";
import type { UpdateErrorStatus } from "../../../application/use-cases/UpdateErrorStatus";
import type { DeleteError } from "../../../application/use-cases/DeleteError";
import type { FindErrorConfigsByApiKey } from "../../../application/use-cases/FindErrorConfigsByApiKey";
import type { ErrorSeverity, ErrorStatus } from "../../../domain/entities/AppError";
import type { ErrorIngestData } from "../../../domain/model/ErrorIngestData";
import type { ApiKeyRequest } from "../../../infrastructure/http/express/middleware/ingestKeyMiddleware";

export class ErrorController {
  constructor(
    private readonly ingestError: IngestError,
    private readonly listErrors: ListErrors,
    private readonly getError: GetError,
    private readonly updateErrorStatus: UpdateErrorStatus,
    private readonly deleteError: DeleteError,
    private readonly findErrorConfigsByApiKey: FindErrorConfigsByApiKey,
  ) {}

  async handleIngest(req: Request, res: Response): Promise<void> {
    const { type, message } = req.body as Record<string, string | undefined>;
    if (!type || !message) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }
    const data: ErrorIngestData = { ...(req.body as ErrorIngestData) };
    if (!data.errorConfigId) {
      const configs = await this.findErrorConfigsByApiKey.execute((req as ApiKeyRequest).apiKey.id);
      if (configs.length === 1) data.errorConfigId = configs[0].id;
    }
    const error = await this.ingestError.execute(data);
    res.status(201).json(error);
  }

  async handleList(req: Request, res: Response): Promise<void> {
    const { severity, status, errorConfigId, configId, q } = req.query as Record<string, string | undefined>;
    const errors = await this.listErrors.execute({
      severity:  severity  as ErrorSeverity | undefined,
      status:    status    as ErrorStatus   | undefined,
      // `configId` is the identifier exposed by the configuration selector.
      // Keep `errorConfigId` for backwards compatibility with existing clients.
      errorConfigId: errorConfigId ?? configId,
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
